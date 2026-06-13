"""ACCA FA 学習アプリを自宅Wi-Fiで配信する簡易サーバー。
このファイルと同じフォルダの index.html を、同一Wi-Fi内の端末から開けるようにする。
無料・外部通信なし・アカウント不要。
"""
import http.server, socketserver, socket, os

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# このPCのLAN IPアドレスを取得（DHCPで変わっても自動表示）
def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "<PCのIPアドレス>"
    finally:
        s.close()

ip = lan_ip()
print("=" * 50)
print("  ACCA FA 学習アプリ  サーバー起動中")
print("=" * 50)
print(f"  iPhone / iPad の Safari で次を開く:")
print(f"      http://{ip}:{PORT}")
print()
print("  ※ iPhoneを同じWi-Fiに接続してください")
print("  ※ 停止する時は このウィンドウを閉じる か Ctrl+C")
print("=" * 50)

Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n停止しました。")
