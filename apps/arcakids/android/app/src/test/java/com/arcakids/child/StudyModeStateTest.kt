package com.arcakids.child

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Study mode blocks entertainment apps during a per-day class window.
 * The window can wrap past midnight (e.g. 22:00 -> 06:00), in which case the
 * tail of the window belongs to the following calendar day.
 */
class StudyModeStateTest {

    private fun schedule(
        enabled: Boolean = true,
        days: List<String> = listOf("mon", "tue", "wed", "thu", "fri"),
        hours: Map<String, Pair<String, String>> = mapOf(
            "mon" to ("08:00" to "14:00"),
            "tue" to ("08:00" to "14:00"),
            "wed" to ("08:00" to "14:00"),
            "thu" to ("08:00" to "14:00"),
            "fri" to ("08:00" to "14:00"),
        ),
        blocked: List<String> = listOf("com.zhiliaoapp.musically"),
    ) = StudyModeState(
        enabled = enabled,
        days = days.toSet(),
        hours = hours.mapValues { (_, v) -> StudyModeState.Window(v.first, v.second) },
        blockedPackages = blocked,
    )

    private fun at(hhmm: String): Int {
        val parts = hhmm.split(":")
        return parts[0].toInt() * 60 + parts[1].toInt()
    }

    // ── enabled flag ──────────────────────────────────────────────────────

    @Test
    fun `disabled schedule never blocks`() {
        val s = schedule(enabled = false)
        assertFalse(s.isActiveAt("mon", at("09:00")))
    }

    @Test
    fun `day not in schedule is not blocked`() {
        val s = schedule()
        assertFalse(s.isActiveAt("sat", at("09:00")))
        assertFalse(s.isActiveAt("sun", at("09:00")))
    }

    // ── per-day windows: the core bug was every day sharing day 1's hours ──

    @Test
    fun `each day keeps its own window`() {
        val s = schedule(
            hours = mapOf(
                "mon" to ("08:00" to "10:00"),
                "tue" to ("11:00" to "13:00"),
            ),
            days = listOf("mon", "tue"),
        )
        assertTrue("mon 09:00 inside mon window", s.isActiveAt("mon", at("09:00")))
        assertFalse("mon 12:00 is outside mon window", s.isActiveAt("mon", at("12:00")))
        assertTrue("tue 12:00 inside tue window", s.isActiveAt("tue", at("12:00")))
        assertFalse("tue 09:00 is outside tue window", s.isActiveAt("tue", at("09:00")))
    }

    // ── window boundaries ─────────────────────────────────────────────────

    @Test
    fun `window start is inclusive and end is exclusive`() {
        val s = schedule(days = listOf("mon"))
        assertTrue("start is inclusive", s.isActiveAt("mon", at("08:00")))
        assertTrue("just before end", s.isActiveAt("mon", at("13:59")))
        assertFalse("end is exclusive", s.isActiveAt("mon", at("14:00")))
        assertFalse("one minute after end", s.isActiveAt("mon", at("14:01")))
        assertFalse("one minute before start", s.isActiveAt("mon", at("07:59")))
    }

    // ── overnight windows ─────────────────────────────────────────────────

    @Test
    fun `overnight window covers after-midnight part of the next day`() {
        val s = schedule(
            days = listOf("mon", "tue"),
            hours = mapOf("mon" to ("22:00" to "06:00"), "tue" to ("22:00" to "06:00")),
        )
        assertTrue("mon 23:00", s.isActiveAt("mon", at("23:00")))
        assertFalse("mon 12:00 is outside", s.isActiveAt("mon", at("12:00")))
        // A 22:00 -> 06:00 window on Monday covers Monday evening and Tuesday
        // morning. It does not cover Monday morning, which would be Sunday's
        // window, and Sunday is not scheduled.
        assertFalse("mon 05:00 belongs to an unscheduled Sunday window", s.isActiveAt("mon", at("05:00")))
        assertTrue("tue 02:00 comes from the Monday window", s.isActiveAt("tue", at("02:00")))
        assertFalse("tue 12:00 is outside", s.isActiveAt("tue", at("12:00")))
        assertTrue("wed 02:00 comes from the Tuesday window", s.isActiveAt("wed", at("02:00")))
        assertFalse("sat 02:00 has no scheduled Friday window", s.isActiveAt("sat", at("02:00")))
    }

    @Test
    fun `overnight window does not credit its tail to the day it starts`() {
        val s = schedule(
            days = listOf("mon"),
            hours = mapOf("mon" to ("22:00" to "06:00")),
        )
        assertTrue("mon 23:30", s.isActiveAt("mon", at("23:30")))
        assertFalse("mon 03:00 is Sunday's tail, not Monday's", s.isActiveAt("mon", at("03:00")))
        assertTrue("tue 02:00 is Monday's tail", s.isActiveAt("tue", at("02:00")))
        assertFalse("tue 07:00 is past the end", s.isActiveAt("tue", at("07:00")))
    }

    @Test
    fun `a zero length window does not block the following morning`() {
        val s = schedule(
            days = listOf("mon", "tue"),
            hours = mapOf("mon" to ("09:00" to "09:00"), "tue" to ("09:00" to "09:00")),
        )
        assertFalse("mon 09:00", s.isActiveAt("mon", at("09:00")))
        assertFalse("tue 08:00 must not be treated as a wrap", s.isActiveAt("tue", at("08:00")))
    }

    @Test
    fun `midnight exact boundary belongs to the new window only`() {
        val s = schedule(
            days = listOf("mon"),
            hours = mapOf("mon" to ("22:00" to "00:00")),
        )
        assertTrue("mon 22:00", s.isActiveAt("mon", at("22:00")))
        assertFalse("end at midnight is exclusive", s.isActiveAt("mon", at("00:00")))
    }

    // ── malformed input must fail safe (never lock the child out) ─────────

    @Test
    fun `malformed window never blocks`() {
        val s = StudyModeState(
            enabled = true,
            days = setOf("mon"),
            hours = mapOf("mon" to StudyModeState.Window("nope", "14:00")),
            blockedPackages = listOf("com.zhiliaoapp.musically"),
        )
        assertFalse(s.isActiveAt("mon", at("09:00")))
    }

    @Test
    fun `identical start and end never blocks`() {
        val s = schedule(days = listOf("mon"), hours = mapOf("mon" to ("09:00" to "09:00")))
        assertFalse("a zero-length window must not lock the device", s.isActiveAt("mon", at("09:00")))
    }

    @Test
    fun `out of range hour never blocks`() {
        val s = schedule(days = listOf("mon"), hours = mapOf("mon" to ("25:00" to "26:00")))
        assertFalse(s.isActiveAt("mon", at("09:00")))
    }

    @Test
    fun `missing day entry is ignored`() {
        val s = schedule(days = listOf("mon", "tue"), hours = mapOf("mon" to ("08:00" to "14:00")))
        assertFalse("tue has no window at all", s.isActiveAt("tue", at("09:00")))
        assertTrue("mon still works", s.isActiveAt("mon", at("09:00")))
    }

    // ── poll cadence: boundaries must not be missed ───────────────────────

    @Test
    fun `window about to open triggers the fast cadence`() {
        val s = schedule(days = listOf("mon"))
        assertTrue("opens in 5 minutes", s.opensWithinMinutes("mon", at("07:55"), 10))
        assertTrue("opens exactly now", s.opensWithinMinutes("mon", at("08:00"), 10))
        assertFalse("opens much later", s.opensWithinMinutes("mon", at("07:00"), 10))
    }

    @Test
    fun `window about to close triggers the fast cadence`() {
        val s = schedule(days = listOf("mon"))
        assertTrue("closes in 5 minutes", s.closesWithinMinutes("mon", at("13:55"), 10))
        assertFalse("closes much later", s.closesWithinMinutes("mon", at("12:00"), 10))
        assertFalse("not active yet, so no close", s.closesWithinMinutes("mon", at("07:00"), 10))
    }

    @Test
    fun `cadence helpers stay inert when study mode is off`() {
        val s = schedule(enabled = false, days = listOf("mon"))
        assertFalse(s.opensWithinMinutes("mon", at("08:00"), 10))
        assertFalse(s.closesWithinMinutes("mon", at("13:00"), 10))
    }

    @Test
    fun `overnight window closing is handled on the following day`() {
        val s = schedule(days = listOf("mon"), hours = mapOf("mon" to ("22:00" to "06:00")))
        assertTrue("opens tonight", s.opensWithinMinutes("mon", at("21:55"), 10))
        assertTrue("closes tomorrow morning from the tail", s.closesWithinMinutes("tue", at("05:55"), 10))
        assertFalse("no close on the start day", s.closesWithinMinutes("mon", at("23:00"), 10))
    }

    @Test
    fun `cadence helper ignores unscheduled days`() {
        val s = schedule(days = listOf("mon"))
        assertFalse(s.opensWithinMinutes("sat", at("07:55"), 10))
    }

    @Test
    fun `the close time is read from the day the window was defined on`() {
        // Regression: the close lookup must resolve the *previous* day's window
        // while the child is inside the overnight tail, not the undefined window
        // for the current day.
        val s = schedule(days = listOf("mon"), hours = mapOf("mon" to ("22:00" to "06:00")))
        assertTrue("tail is active", s.isActiveAt("tue", at("05:55")))
        assertTrue("and it closes 5 minutes later", s.closesWithinMinutes("tue", at("05:55"), 10))
        assertEquals(
            "closing minute must come from Monday's window",
            5,
            (360 - at("05:55") + 1440) % 1440,
        )
    }

    // ── blocked packages ──────────────────────────────────────────────────

    @Test
    fun `blocked packages are reported only while active`() {
        val s = schedule()
        assertEquals(listOf("com.zhiliaoapp.musically"), s.blockedPackagesNow("mon", at("09:00")))
        assertTrue(s.blockedPackagesNow("mon", at("09:00")).isNotEmpty())
        assertTrue(s.blockedPackagesNow("sat", at("09:00")).isEmpty())
        assertTrue(s.blockedPackagesNow("mon", at("20:00")).isEmpty())
    }

    // ── JSON parsing, as returned by get_study_mode_schedule_for_device ───

    @Test
    fun `parses the device rpc payload`() {
        val json = JSONObject(
            """{"enabled":true,"days":["mon","wed"],
                "hours":{"mon":{"start":"09:15","end":"13:45"},
                         "wed":{"start":"10:00","end":"12:00"}},
                "blocked_packages":["com.zhiliaoapp.musically","com.instagram.android"]}"""
        )
        val s = StudyModeState.fromJson(json)
        assertTrue(s.enabled)
        assertEquals(setOf("mon", "wed"), s.days)
        assertEquals("09:15", s.hours["mon"]?.start)
        assertEquals("13:45", s.hours["mon"]?.end)
        assertEquals("10:00", s.hours["wed"]?.start)
        assertEquals(2, s.blockedPackages.size)
        assertTrue(s.isActiveAt("mon", at("09:15")))
        assertFalse(s.isActiveAt("tue", at("11:00")))
    }

    @Test
    fun `parses legacy payload with hours as an array`() {
        val json = JSONObject(
            """{"enabled":true,"days":["mon"],
                "hours":[{"start":"08:00","end":"14:00"}],
                "blocked_packages":[]}"""
        )
        val s = StudyModeState.fromJson(json)
        assertTrue(s.days.contains("mon"))
        assertTrue(s.isActiveAt("mon", at("09:00")))
    }

    @Test
    fun `parses double encoded json without throwing`() {
        val inner = JSONObject(
            """{"enabled":true,"days":["tue"],
                "hours":{"tue":{"start":"08:00","end":"15:00"}},
                "blocked_packages":[]}"""
        )
        val s = StudyModeState.fromJson(JSONObject().put("result", inner.toString()))
        assertTrue(s.enabled)
        assertTrue(s.isActiveAt("tue", at("10:00")))
    }

    @Test
    fun `empty payload yields an inert schedule`() {
        val s = StudyModeState.fromJson(JSONObject())
        assertFalse(s.enabled)
        assertFalse(s.isActiveAt("mon", at("09:00")))
        assertTrue(s.blockedPackages.isEmpty())
    }

    // ── day ordering helpers ──────────────────────────────────────────────

    @Test
    fun `previous day wraps from monday to sunday`() {
        assertEquals("sun", StudyModeState.previousDay("mon"))
        assertEquals("mon", StudyModeState.previousDay("tue"))
        assertEquals("sat", StudyModeState.previousDay("sun"))
    }

    @Test
    fun `java calendar day maps to schedule keys`() {
        // java.util.Calendar: SUNDAY = 1 ... SATURDAY = 7
        assertEquals("sun", StudyModeState.dayKeyFor(1))
        assertEquals("mon", StudyModeState.dayKeyFor(2))
        assertEquals("fri", StudyModeState.dayKeyFor(6))
        assertEquals("sat", StudyModeState.dayKeyFor(7))
    }
}
