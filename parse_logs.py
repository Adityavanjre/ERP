import json
import re

transcript_path = r"C:\Users\adity\.gemini\antigravity-ide\brain\263f46a5-59b8-447c-ad0a-5f07fde16ba0\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("type") == "BROWSER_SUBAGENT":
                # Search for console log entries inside the stringified content
                content = data.get("content", "")
                print("Found Subagent Step. Content length:", len(content))
                
                # Let's search for "capture_browser_console_logs" or log entries
                matches = re.findall(r'"logs":\[.*?\]', content)
                for match in matches:
                    print("Log match:", match[:1000])
                    
                # Dump content to a file
                with open("subagent_content.txt", "w", encoding="utf-8") as out:
                    out.write(content)
                print("Dumped content to subagent_content.txt")
        except Exception as e:
            print("Error parsing line:", e)
