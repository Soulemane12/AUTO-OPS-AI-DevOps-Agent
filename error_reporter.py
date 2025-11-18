import traceback
import requests
import sys
from pathlib import Path

AUTO_OPS_URL = "http://localhost:3000/api/report-error"  # update in prod

def run_with_auto_ops(script_path):
    code = ""
    try:
        with open(script_path, "r") as f:
            code = f.read()
        # Execute the script in its own namespace
        globals_dict = {"__name__": "__main__"}
        exec(compile(code, script_path, "exec"), globals_dict)
    except Exception as e:
        tb = traceback.format_exc()
        payload = {
            "filename": script_path,
            "error_type": type(e).__name__,
            "message": str(e),
            "traceback": tb,
            "code": code,
        }
        try:
            res = requests.post(AUTO_OPS_URL, json=payload, timeout=5)
            print("Sent error to AUTO-OPS:", res.status_code)
        except Exception as net_err:
            print("Failed to send error to AUTO-OPS:", net_err)
        raise  # optional: re-raise or not

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python error_reporter.py your_script.py")
        sys.exit(1)
    run_with_auto_ops(sys.argv[1])
