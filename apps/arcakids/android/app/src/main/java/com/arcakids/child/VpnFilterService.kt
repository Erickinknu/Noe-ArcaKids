package com.arcakids.child

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.ParcelFileDescriptor
import org.json.JSONArray
import org.json.JSONObject
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors

/**
 * Internet Seguro (Parte 5): VPN transparente de filtrado de dominios.
 *
 * - Intercepta las consultas DNS de los navegadores y apps (UDP 53).
 * - Bloquea (descarta) el paquete si el dominio coincide con las categorías
 *   habilitadas del filtrado web de la familia (RPC get_web_filter_rules_for_device)
 *   o con los sitios manuales (web_filters.blocked_sites).
 * - Reporta a report_web_visit cada dominio visitado/bloqueado (historial NOE).
 *
 * Funciona en silencio incluso sin pantalla: la App es device owner/MDM y la
 * conexión VPN (ParcelFileDescriptor) se mantiene mientras el proceso vive.
 * El consentimiento VPN (VpnService.prepare) se autoconcede para device owner;
 * para no-owner lo gestiona la capa JS antes de habilitar.
 */
class VpnFilterService : VpnService() {

    companion object {
        private const val PREFS = "arcakids_web_filter"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_RULES_CACHE = "rules_cache_json"
        private const val RP_REPORTER = "arcakids_usage_reporter"

        private const val ACTION_START = "com.arcakids.child.action.START_WEB_FILTER"
        private const val ACTION_STOP = "com.arcakids.child.action.STOP_WEB_FILTER"

        private const val RULES_REFRESH_MS = 60_000L
        private const val VISIT_FLUSH_MS = 20_000L
        private const val VISIT_THROTTLE_MS = 60_000L
        private const val FLUSH_BATCH = 30

        // ── Categorías -> dominios conocidos (curated, expandible) ───────

        val CATEGORY_DOMAINS: Map<String, List<String>> = mapOf(
            "social" to listOf(
                "facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com",
                "snapchat.com", "discord.com", "reddit.com", "pinterest.com", "linkedin.com",
                "twitch.tv", "whatsapp.com", "telegram.org", "signal.org", "tumblr.com"
            ),
            "gaming" to listOf(
                "roblox.com", "fortnite.com", "epicgames.com", "minecraft.net",
                "xbox.com", "playstation.com", "steampowered.com", "pokemon.com"
            ),
            "adult" to listOf(
                "pornhub.com", "xvideos.com", "xhamster.com", "onlyfans.com", "redtube.com",
                "youporn.com", "stripchat.com", "loverox.com", "nudevista.com", "boyfriendtv.com"
            ),
            "violence" to listOf(
                "4chan.org", "liveleak.com", "shootimg.com", "redteamfilms.com"
            ),
            "gambling" to listOf(
                "bet365.com", "betway.com", "pokerstars.com", "bwin.com", "williamhill.com",
                "888casino.com", "unibet.com", "ganabet.com", "codere.com", "trecetb.com"
            ),
            "drugs" to listOf(
                "erowid.org", "leafly.com", "weedmaps.com"
            )
        )

        fun isEnabled(context: Context): Boolean =
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

        fun setEnabled(context: Context, enabled: Boolean) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, enabled).apply()
        }

        fun start(context: Context) {
            context.startService(Intent(context, VpnFilterService::class.java).setAction(ACTION_START))
        }

        fun stop(context: Context) {
            context.startService(Intent(context, VpnFilterService::class.java).setAction(ACTION_STOP))
        }
    }

    private val ioExecutor = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())
    private val visitQueue = ConcurrentLinkedQueue<Pair<String, Boolean>>()
    private val lastVisitLogged = ConcurrentHashMap<String, Long>()

    @Volatile
    private var running = false
    private var tunnelFd: android.os.ParcelFileDescriptor? = null

    @Volatile
    private var blockRules: List<String> = emptyList()

    private val periodic = object : Runnable {
        override fun run() {
            if (!running) {
                if (isEnabled(this@VpnFilterService) && prepare(this@VpnFilterService) == null) {
                    startTunnel()
                }
            } else {
                ioExecutor.execute { refreshRules(useNetwork = true) }
                ioExecutor.execute { flushVisits() }
            }
            handler.postDelayed(this, Math.min(RULES_REFRESH_MS, VISIT_FLUSH_MS))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = super.onBind(intent)

    override fun onCreate() {
        super.onCreate()
        handler.postDelayed(periodic, VISIT_FLUSH_MS)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                setEnabled(this, false)
                stopTunnel()
                stopSelf()
                return START_NOT_STICKY
            }
            else -> {
                if (!isEnabled(this)) setEnabled(this, true)
                if (prepare(this) == null && !running) startTunnel()
                else refreshCache()
                return START_STICKY
            }
        }
    }

    override fun onDestroy() {
        running = false
        handler.removeCallbacksAndMessages(null)
        ioExecutor.shutdownNow()
        stopTunnel()
        super.onDestroy()
    }

    // ── Tunnel ──────────────────────────────────────────────────────────

    private fun startTunnel() {
        if (running) return
        running = true
        ioExecutor.execute { tunnelLoop() }
    }

    private fun stopTunnel() {
        running = false
        tunnelFd?.let { fd ->
            try { fd.close() } catch (ignored: Exception) {}
        }
        tunnelFd = null
    }

    private fun tunnelLoop() {
        val builder = Builder()
            .setSession("Internet Seguro · ARCA KIDS")
            .addAddress("10.99.0.2", 32)
            .addDnsServer("8.8.8.8")
            .addDnsServer("1.1.1.1")
            .addRoute("0.0.0.0", 0)
            .setBlocking(true)

        val established: ParcelFileDescriptor? = try { builder.establish() } catch (t: Throwable) { null }
        if (established == null) {
            running = false
            return
        }
        val fd = established
        tunnelFd = fd
        refreshCache()

        val input = FileInputStream(fd.fileDescriptor)
        val output = FileOutputStream(fd.fileDescriptor)
        val buffer = ByteArray(32767)

        while (running) {
            val n = try { input.read(buffer) } catch (t: Throwable) { break }
            if (n <= 0) break
            val decision = inspectPacket(buffer, n)
            val host = decision.host
            if (host == null) {
                try {
                    output.write(buffer, 0, n)
                } catch (t: Throwable) {
                    break
                }
                continue
            }
            if (decision.blocked) {
                enqueueVisit(host, true)
            } else {
                enqueueVisit(host, false)
                try {
                    output.write(buffer, 0, n)
                } catch (t: Throwable) {
                    break
                }
            }
        }

        running = false
        tunnelFd = null
        try { fd.close() } catch (ignored: Exception) {}
    }

    // ── Packet inspection (IPv4/UDP DNS) ───────────────────────────────

    private class PacketDecision(val host: String?, val blocked: Boolean)

    private fun inspectPacket(buf: ByteArray, n: Int): PacketDecision {
        if (n < 28) return PacketDecision(null, false)
        val version = (buf[0].toInt() ushr 4) and 0x0F
        if (version != 4) return PacketDecision(null, false)
        val ihl = (buf[0].toInt() and 0x0F) * 4
        if (n < ihl + 8) return PacketDecision(null, false)
        val protocol = buf[9].toInt() and 0xFF
        // Solo UDP (17): el filtrado de dominios opera sobre consultas DNS.
        if (protocol != 17) return PacketDecision(null, false)

        val srcPort = ((buf[ihl].toInt() and 0xFF) shl 8) or (buf[ihl + 1].toInt() and 0xFF)
        val dstPort = ((buf[ihl + 2].toInt() and 0xFF) shl 8) or (buf[ihl + 3].toInt() and 0xFF)
        if (srcPort != 53 && dstPort != 53) return PacketDecision(null, false)

        val dnsStart = ihl + 8
        if (n < dnsStart + 12) return PacketDecision(null, false)
        val qdCount = ((buf[dnsStart + 4].toInt() and 0xFF) shl 8) or (buf[dnsStart + 5].toInt() and 0xFF)
        if (qdCount == 0) return PacketDecision(null, false)

        val qname = parseQName(buf, dnsStart + 12, n) ?: return PacketDecision(null, false)
        var host = qname.lowercase(Locale.ROOT)
        if (host.startsWith("www.")) host = host.removePrefix("www.")

        val blocked = blockRules.any { rule ->
            host == rule || host.endsWith(".$rule")
        }
        return PacketDecision(host, blocked)
    }

    private fun parseQName(buf: ByteArray, start: Int, end: Int): String? {
        var pos = start
        val parts = mutableListOf<String>()
        var guard = 0
        while (pos < end && guard < 16) {
            val len = buf[pos].toInt() and 0xFF
            if (len == 0) { pos++; break }
            if ((len and 0xC0) == 0xC0) { guard++; pos += 2; continue }
            if (pos + 1 + len > end) return null
            parts.add(String(buf, pos + 1, len, Charsets.US_ASCII))
            pos += 1 + len
            guard++
        }
        if (parts.isEmpty()) return null
        return parts.joinToString(".")
    }

    // ── Rules (remote policy, same RPC style as EnforcementService) ─────

    private fun refreshCache() {
        blockRules = loadCachedRules()
        ioExecutor.execute { refreshRules(useNetwork = true) }
    }

    private fun loadCachedRules(): List<String> {
        val raw = getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_RULES_CACHE, null)
            ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { arr.getString(it) }
        } catch (t: Throwable) {
            emptyList()
        }
    }

    private fun refreshRules(useNetwork: Boolean) {
        val fetched = if (useNetwork) maybeFetchRules() else null
        if (fetched != null) {
            blockRules = fetched
            val arr = JSONArray()
            fetched.forEach { arr.put(it) }
            getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_RULES_CACHE, arr.toString()).apply()
        } else if (blockRules.isEmpty()) {
            blockRules = loadCachedRules()
        }
    }

    private fun maybeFetchRules(): List<String>? {
        val p = getSharedPreferences(RP_REPORTER, Context.MODE_PRIVATE)
        val url = p.getString("supabase_url", null) ?: return null
        val anonKey = p.getString("supabase_anon_key", null) ?: return null
        val deviceUuid = p.getString("device_uuid", null) ?: return null
        try {
            val rows = rpc(
                url, anonKey, "get_web_filter_rules_for_device",
                JSONObject().put("p_device_uuid", deviceUuid)
            )
            val rules = linkedSetOf<String>()
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                if (!row.optBoolean("enabled", false)) continue
                CATEGORY_DOMAINS[row.optString("category")]?.let { rules.addAll(it) }
                row.optJSONArray("blocked_sites")?.let { arr ->
                    for (j in 0 until arr.length()) {
                        val site = normalizeManualSite(arr.getString(j))
                        if (site.isNotEmpty()) rules.add(site)
                    }
                }
            }
            return rules.toList()
        } catch (t: Throwable) {
            return null
        }
    }

    private fun normalizeManualSite(input: String): String {
        return input.trim()
            .lowercase(Locale.ROOT)
            .removePrefix("https://")
            .removePrefix("http://")
            .removePrefix("www.")
            .substringBefore('/')
            .substringBefore(':')
    }

    // ── Visit reporting (throttled, batched) ────────────────────────────

    private fun enqueueVisit(host: String, blocked: Boolean) {
        val now = System.currentTimeMillis()
        val key = (if (blocked) "B:" else "V:") + host
        val last = lastVisitLogged[key]
        if (last != null && now - last < VISIT_THROTTLE_MS) return
        lastVisitLogged[key] = now
        if (visitQueue.size >= 500) visitQueue.clear()
        visitQueue.add(Pair(host, blocked))
    }

    private fun flushVisits() {
        if (visitQueue.isEmpty()) return
        val p = getSharedPreferences(RP_REPORTER, Context.MODE_PRIVATE)
        val url = p.getString("supabase_url", null) ?: return
        val anonKey = p.getString("supabase_anon_key", null) ?: return
        val deviceUuid = p.getString("device_uuid", null) ?: return

        var batch = 0
        while (batch < FLUSH_BATCH) {
            val visit = visitQueue.poll() ?: break
            val (host, blocked) = visit
            try {
                postVisit(url, anonKey, deviceUuid, host, blocked)
                batch++
            } catch (t: Throwable) {
                visitQueue.add(visit)
                break
            }
        }
    }

    private fun postVisit(url: String, anonKey: String, deviceUuid: String, hostname: String, blocked: Boolean) {
        val body = JSONObject()
            .put("p_device_uuid", deviceUuid)
            .put("p_hostname", hostname)
            .put("p_blocked", blocked)
        val connection = URL("${url.trimEnd('/')}/rest/v1/rpc/report_web_visit").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", anonKey)
            connection.setRequestProperty("Authorization", "Bearer $anonKey")
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }
            connection.inputStream.close()
        } finally {
            connection.disconnect()
        }
    }

    private fun rpc(url: String, anonKey: String, fn: String, params: JSONObject): JSONArray {
        val connection = URL("${url}/rest/v1/rpc/$fn").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("apikey", anonKey)
            connection.setRequestProperty("Authorization", "Bearer $anonKey")
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(params.toString()) }
            val input = connection.inputStream
            val text = input.bufferedReader(Charsets.UTF_8).use { it.readText() }
            if (text.isBlank()) return JSONArray()
            return JSONArray(text)
        } finally {
            connection.disconnect()
        }
    }
}