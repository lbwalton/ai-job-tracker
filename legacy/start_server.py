#!/usr/bin/env python3
"""
Simple HTTP server for the Job Tracker App
Serves the application locally for easy access
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class JobTrackerHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def end_headers(self):
        # Add headers to prevent caching issues
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    # Change to the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    with socketserver.TCPServer(("", PORT), JobTrackerHTTPRequestHandler) as httpd:
        print(f"Job Tracker App is running at: http://localhost:{PORT}/job_tracker_app.html")
        print(f"Server directory: {script_dir}")
        print("Press Ctrl+C to stop the server")

        # Automatically open the browser
        webbrowser.open(f'http://localhost:{PORT}/job_tracker_app.html')

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()