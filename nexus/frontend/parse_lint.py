
import json

with open('lint_output.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

for file in data:
    if file['messages']:
        print(f"File: {file['filePath']}")
        for msg in file['messages']:
            print(f"  {msg['line']}:{msg['column']} - {msg['ruleId']} - {msg['message']}")
