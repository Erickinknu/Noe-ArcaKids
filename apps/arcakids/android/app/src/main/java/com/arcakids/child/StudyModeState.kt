package com.arcakids.child

import org.json.JSONArray
import org.json.JSONObject

/**
 * Study mode blocks the parent's selected entertainment apps while the child
 * is in class.
 *
 * The schedule is stored per weekday so a parent can set, for example, a
 * different window on Monday and Tuesday. A window whose end is earlier than
 * its start wraps past midnight, and the tail of that window belongs to the
 * following calendar day.
 *
 * Every parser here fails safe: malformed input yields an inert schedule so a
 * bad payload can never lock a child out of their device.
 */
data class StudyModeState(
    val enabled: Boolean = false,
    val days: Set<String> = emptySet(),
    val hours: Map<String, Window> = emptyMap(),
    val blockedPackages: List<String> = emptyList(),
) {

    data class Window(val start: String, val end: String) {
        val startMinutes: Int? get() = parseMinutes(start)
        val endMinutes: Int? get() = parseMinutes(end)

        /**
         * True when the window continues into the next calendar day. A window
         * whose end equals its start is not a wrap, it is a mistake: treating
         * it as one would silently block the small hours of the following day.
         */
        val wrapsMidnight: Boolean
            get() {
                val s = startMinutes ?: return false
                val e = endMinutes ?: return false
                return e < s
            }
    }

    /**
     * Whether study mode is in force on [dayKey] at [minutesOfDay].
     *
     * [dayKey] is one of mon..sun. A window that started the previous day still
     * applies to the small hours of today. The early hours of a day are never
     * part of that same day's window, even when the window wraps: a 22:00 to
     * 06:00 window on Monday covers Monday evening and Tuesday morning, not
     * Monday morning.
     */
    fun isActiveAt(dayKey: String, minutesOfDay: Int): Boolean =
        activeWindow(dayKey, minutesOfDay) != null

    /**
     * The window that makes study mode active right now, or null.
     *
     * Every query resolves the window through here so the "is it active" answer
     * and the "when does it end" answer can never disagree about which day the
     * window belongs to.
     */
    private fun activeWindow(dayKey: String, minutesOfDay: Int): Window? {
        if (!enabled) return null

        val today = hours[dayKey]
        if (days.contains(dayKey) && today != null) {
            val start = today.startMinutes
            val end = today.endMinutes
            if (start != null && end != null && start != end) {
                if (end > start) {
                    if (minutesOfDay >= start && minutesOfDay < end) return today
                } else {
                    // Wrapping window: only the part from start onwards belongs
                    // to this day. The tail is credited to the next day below.
                    if (minutesOfDay >= start) return today
                }
            }
        }

        val previousKey = previousDay(dayKey)
        val previous = hours[previousKey]
        if (previous != null && days.contains(previousKey) && previous.wrapsMidnight) {
            val end = previous.endMinutes
            if (end != null && minutesOfDay < end) return previous
        }

        return null
    }

    /** The packages to block right now; empty unless the window is active. */
    fun blockedPackagesNow(dayKey: String, minutesOfDay: Int): List<String> =
        if (isActiveAt(dayKey, minutesOfDay)) blockedPackages else emptyList()

    /** True when a window starts within [withinMinutes] of the given time. */
    fun opensWithinMinutes(dayKey: String, minutesOfDay: Int, withinMinutes: Int): Boolean {
        if (!enabled) return false
        if (!days.contains(dayKey)) return false
        val window = hours[dayKey] ?: return false
        val start = window.startMinutes ?: return false
        if (start == window.endMinutes) return false
        val delta = (start - minutesOfDay + 1440) % 1440
        return delta in 0..withinMinutes
    }

    /** True when the active window ends within [withinMinutes] of the given time. */
    fun closesWithinMinutes(dayKey: String, minutesOfDay: Int, withinMinutes: Int): Boolean {
        val window = activeWindow(dayKey, minutesOfDay) ?: return false
        val end = window.endMinutes ?: return false
        // The modulo covers the overnight tail: on the following day at 05:55
        // the end of 06:00 is 5 minutes away. In the start segment the same
        // subtraction lands past the window, so it stays false until the child
        // actually reaches the tail.
        val delta = (end - minutesOfDay + 1440) % 1440
        return delta in 0..withinMinutes
    }

    companion object {
        private val DAY_ORDER = listOf("mon", "tue", "wed", "thu", "fri", "sat", "sun")

        fun previousDay(dayKey: String): String {
            val index = DAY_ORDER.indexOf(dayKey)
            if (index < 0) return dayKey
            return DAY_ORDER[(index - 1 + DAY_ORDER.size) % DAY_ORDER.size]
        }

        /**
         * Maps java.util.Calendar's DAY_OF_WEEK to a schedule key.
         * Calendar uses SUNDAY = 1 .. SATURDAY = 7, while the schedule is
         * ordered mon..sun, so the index is shifted by five.
         */
        fun dayKeyFor(calendarDayOfWeek: Int): String =
            DAY_ORDER[(calendarDayOfWeek + 5) % DAY_ORDER.size]

        fun parseMinutes(hhmm: String?): Int? {
            val value = hhmm?.trim() ?: return null
            val parts = value.split(":")
            if (parts.size != 2) return null
            val hours = parts[0].toIntOrNull() ?: return null
            val minutes = parts[1].toIntOrNull() ?: return null
            if (hours !in 0..23 || minutes !in 0..59) return null
            return hours * 60 + minutes
        }

        /**
         * Parses the payload of get_study_mode_schedule_for_device.
         *
         * Accepts the current shape (hours as an object keyed by weekday) and
         * the legacy shape (hours as an array applied to every active day).
         * Also tolerates a doubly encoded JSON string, which older rows in
         * study_mode_schedules still contain.
         */
        fun fromJson(raw: JSONObject?): StudyModeState {
            val json = unwrap(raw) ?: return StudyModeState()
            return try {
                StudyModeState(
                    enabled = json.optBoolean("enabled", false),
                    days = readDays(json),
                    hours = readHours(json),
                    blockedPackages = readStringArray(json, "blocked_packages"),
                )
            } catch (t: Throwable) {
                StudyModeState()
            }
        }

        /** Strips PostgREST's { result, error } envelope and double encoding. */
        private fun unwrap(raw: JSONObject?): JSONObject? {
            if (raw == null) return null
            val result = raw.opt("result")
            if (result is JSONObject) return unwrap(result)
            if (result is String) return try {
                unwrap(JSONObject(result))
            } catch (t: Throwable) {
                raw
            }
            return raw
        }

        private fun readDays(json: JSONObject): Set<String> {
            val days = linkedSetOf<String>()
            readStringArray(json, "days").forEach { value ->
                val key = value.trim().lowercase()
                if (DAY_ORDER.contains(key)) days.add(key)
            }
            return days
        }

        private fun readHours(json: JSONObject): Map<String, Window> {
            val windows = linkedMapOf<String, Window>()

            json.optJSONObject("hours")?.let { obj ->
                DAY_ORDER.forEach { key ->
                    val entry = obj.optJSONObject(key) ?: return@forEach
                    val start = entry.optString("start")
                    val end = entry.optString("end")
                    if (start.isNotBlank() && end.isNotBlank()) {
                        windows[key] = Window(start, end)
                    }
                }
            }

            // Legacy: a single window applied to every active day.
            if (windows.isEmpty()) {
                val arr = json.optJSONArray("hours")
                if (arr != null && arr.length() > 0) {
                    val first = arr.optJSONObject(0)
                    val start = first?.optString("start").orEmpty()
                    val end = first?.optString("end").orEmpty()
                    if (start.isNotBlank() && end.isNotBlank()) {
                        readDays(json).forEach { windows[it] = Window(start, end) }
                    }
                }
            }

            return windows
        }

        private fun readStringArray(json: JSONObject, key: String): List<String> {
            val arr: JSONArray = json.optJSONArray(key) ?: return emptyList()
            val out = ArrayList<String>(arr.length())
            for (i in 0 until arr.length()) {
                val value = arr.optString(i)
                if (value.isNotBlank()) out.add(value)
            }
            return out
        }
    }
}
