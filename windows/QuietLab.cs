using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("QuietLab")]
[assembly: AssemblyDescription("Local fan geometry, cooling and aeroacoustic screening studio")]
[assembly: AssemblyProduct("QuietLab")]
[assembly: AssemblyVersion("1.2.0.0")]
[assembly: AssemblyFileVersion("1.2.0.0")]

namespace QuietLab
{
    internal sealed class LocalServer : IDisposable
    {
        private readonly Dictionary<string, byte[]> files = new Dictionary<string, byte[]>(StringComparer.Ordinal);
        private TcpListener listener;
        private volatile bool running;
        private readonly SemaphoreSlim slots = new SemaphoreSlim(16, 16);
        public int Port { get; private set; }
        public string Url { get { return "http://127.0.0.1:" + Port + "/"; } }

        public LocalServer(int preferredPort, bool allowFallback)
        {
            foreach (string name in new[] { "index.html", "style.css", "app.js", "model.js", "thermal.js", "rotor3d.js" })
            {
                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("QuietLab.Web." + name))
                {
                    if (stream == null) throw new InvalidOperationException("Embedded app asset is missing: " + name);
                    using (MemoryStream buffer = new MemoryStream()) { stream.CopyTo(buffer); files["/" + name] = buffer.ToArray(); }
                }
            }
            listener = new TcpListener(IPAddress.Loopback, preferredPort);
            try { listener.Start(32); }
            catch (SocketException)
            {
                if (!allowFallback) throw;
                listener = new TcpListener(IPAddress.Loopback, 0);
                listener.Start(32);
            }
            Port = ((IPEndPoint)listener.LocalEndpoint).Port;
            running = true;
            Thread worker = new Thread(AcceptLoop); worker.IsBackground = true; worker.Start();
        }

        private void AcceptLoop()
        {
            while (running)
            {
                TcpClient client;
                try { client = listener.AcceptTcpClient(); }
                catch (SocketException) { if (!running) return; continue; }
                catch (ObjectDisposedException) { return; }
                if (!slots.Wait(0)) { client.Close(); continue; }
                ThreadPool.QueueUserWorkItem(delegate { try { Serve(client); } finally { slots.Release(); } });
            }
        }

        private void Serve(TcpClient client)
        {
            using (client)
            {
                client.ReceiveTimeout = 3000; client.SendTimeout = 3000;
                try
                {
                    NetworkStream stream = client.GetStream();
                    byte[] buffer = new byte[8192]; int count = 0;
                    while (count < buffer.Length)
                    {
                        int n = stream.Read(buffer, count, Math.Min(1024, buffer.Length - count));
                        if (n == 0) return;
                        count += n;
                        if (Encoding.ASCII.GetString(buffer, 0, count).Contains("\r\n\r\n")) break;
                    }
                    string request = Encoding.ASCII.GetString(buffer, 0, count);
                    if (!request.Contains("\r\n\r\n")) { Reply(stream, 431, "Request Header Fields Too Large", "text/plain", Encoding.UTF8.GetBytes("Header too large"), false); return; }
                    string[] lines = request.Split(new[] { "\r\n" }, StringSplitOptions.None);
                    string[] parts = lines[0].Split(' ');
                    if (parts.Length != 3 || !parts[1].StartsWith("/") || !parts[2].StartsWith("HTTP/1.")) { Reply(stream, 400, "Bad Request", "text/plain", Encoding.UTF8.GetBytes("Invalid request"), false); return; }
                    bool head = parts[0] == "HEAD";
                    if (parts[0] != "GET" && !head) { Reply(stream, 405, "Method Not Allowed", "text/plain", Encoding.UTF8.GetBytes("Read-only local app"), false); return; }
                    // Restrict Host to this origin to reject browser DNS-rebinding requests.
                    string host = null;
                    foreach (string line in lines) if (line.StartsWith("Host:", StringComparison.OrdinalIgnoreCase)) host = line.Substring(5).Trim();
                    if (host != "127.0.0.1:" + Port && host != "localhost:" + Port) { Reply(stream, 403, "Forbidden", "text/plain", Encoding.UTF8.GetBytes("Invalid host"), head); return; }
                    string route = parts[1].Split('?')[0]; if (route == "/") route = "/index.html";
                    byte[] body;
                    if (!files.TryGetValue(route, out body)) { Reply(stream, 404, "Not Found", "text/plain", Encoding.UTF8.GetBytes("Not found"), head); return; }
                    string type = route.EndsWith(".html") ? "text/html; charset=utf-8" : route.EndsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";
                    Reply(stream, 200, "OK", type, body, head);
                }
                catch (IOException) { }
                catch (SocketException) { }
            }
        }

        private void Reply(NetworkStream stream, int status, string reason, string type, byte[] body, bool head)
        {
            string headers = "HTTP/1.1 " + status + " " + reason + "\r\nContent-Type: " + type + "\r\nContent-Length: " + body.Length + "\r\nConnection: close\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\n\r\n";
            byte[] bytes = Encoding.ASCII.GetBytes(headers); stream.Write(bytes, 0, bytes.Length);
            if (!head) stream.Write(body, 0, body.Length);
        }
        public void Dispose() { running = false; if (listener != null) listener.Stop(); }
    }

    internal sealed class LauncherWindow : Form
    {
        public LauncherWindow(LocalServer server)
        {
            Text = "QuietLab"; ClientSize = new Size(500, 285); FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false; StartPosition = FormStartPosition.CenterScreen; BackColor = Color.FromArgb(243, 246, 246);
            Font = new Font("Segoe UI", 10);
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            Label title = new Label { Text = "QuietLab is running", Font = new Font("Segoe UI", 20, FontStyle.Bold), ForeColor = Color.FromArgb(32, 63, 57), AutoSize = true, Location = new Point(28, 24) };
            Label note = new Label { Text = "Your fan design studio opens in your browser.\nKeep this window open while using the app.", AutoSize = true, Location = new Point(30, 79) };
            Label url = new Label { Text = server.Url, ForeColor = Color.FromArgb(8, 127, 112), AutoSize = true, Location = new Point(30, 133) };
            Button open = new Button { Text = "Open studio", Location = new Point(30, 170), Size = new Size(150, 42), BackColor = Color.FromArgb(8, 127, 112), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            Button stop = new Button { Text = "Stop and close", Location = new Point(193, 170), Size = new Size(150, 42), FlatStyle = FlatStyle.Flat };
            Label detail = new Label { Text = server.Port == 4173 ? "Offline app · files are embedded · no Node.js needed" : "Port 4173 is busy. This session uses a different browser origin.", Font = new Font("Segoe UI", 9), ForeColor = Color.FromArgb(92, 113, 115), AutoSize = true, Location = new Point(30, 236) };
            open.Click += delegate { OpenBrowser(server.Url); }; stop.Click += delegate { Close(); };
            Controls.AddRange(new Control[] { title, note, url, open, stop, detail });
            Shown += delegate { OpenBrowser(server.Url); };
        }
        private static void OpenBrowser(string url)
        {
            try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); }
            catch (Exception ex) { MessageBox.Show("Open this address in your browser:\n" + url + "\n\n" + ex.Message, "QuietLab"); }
        }
    }

    internal static class Program
    {
        [STAThread]
        public static int Main(string[] args)
        {
            bool headless = Array.IndexOf(args, "--headless") >= 0;
            int port = 4173; string readyFile = null;
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--port" && i + 1 < args.Length) port = Int32.Parse(args[++i]);
                if (args[i] == "--ready-file" && i + 1 < args.Length) readyFile = args[++i];
            }
            try
            {
                using (LocalServer server = new LocalServer(port, !headless))
                {
                    if (readyFile != null) File.WriteAllText(readyFile, server.Url, Encoding.UTF8);
                    if (headless) { Thread.Sleep(Timeout.Infinite); return 0; }
                    Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
                    Application.Run(new LauncherWindow(server));
                }
                return 0;
            }
            catch (Exception ex) { if (!headless) MessageBox.Show(ex.Message, "QuietLab could not start", MessageBoxButtons.OK, MessageBoxIcon.Error); return 1; }
        }
    }
}
