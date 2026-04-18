import sys

def check_brackets(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    for i, char in enumerate(content):
        if char == '{':
            stack.append(('{', i))
        elif char == '}':
            if not stack:
                print(f"Extra closing brace at index {i}")
                context = content[max(0, i-50):min(len(content), i+50)]
                print(f"Context: {context}")
                return
            stack.pop()
    
    if stack:
        char, idx = stack[-1]
        print(f"Unclosed opening brace at index {idx}")
        context = content[max(0, idx-100):min(len(content), idx+100)]
        print(f"Context: {context}")
    else:
        print("Braces are balanced")

if __name__ == "__main__":
    check_brackets(sys.argv[1])
