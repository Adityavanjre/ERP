import json
import requests
import re
import os

def check_url(url):
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.head(url, headers=headers, allow_redirects=True, timeout=5)
        if response.status_code >= 400:
            # Try GET if HEAD is forbidden/weird
            response = requests.get(url, headers=headers, allow_redirects=True, timeout=5, stream=True)
            if response.status_code >= 400:
                print(f"BROKEN ({response.status_code}): {url}")
                return f"BROKEN ({response.status_code})"
        return None
    except Exception as e:
        print(f"ERROR: {url} - {str(e)}")
        return f"ERROR ({str(e)})"

def find_urls_in_dir(directory):
    results = [] # list of (url, filepath)
    skip_dirs = {'.git', 'node_modules', 'dist', '.next', 'build', 'coverage'}
    
    # Regex to capture URL cleanly
    # Captures http/https until a quote, whitespace, parenthesis, or backtick
    url_pattern = re.compile(r'https?://[^\s"\'`)]+')
    
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx', '.json', '.css', '.html')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        found = url_pattern.findall(content)
                        for url in found:
                            # Clean the URL
                            clean_url = url.strip().rstrip("',\"`)")
                            
                            # Filter for likely images
                            is_image = False
                            low_url = clean_url.lower()
                            if any(ext in low_url for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.ico']):
                                is_image = True
                            elif 'images.unsplash.com' in low_url:
                                is_image = True
                            elif 'placeholder.com' in low_url:
                                is_image = True
                                
                            if is_image:
                                results.append((clean_url, filepath))
                except Exception as e:
                    print(f"Could not read file {filepath}: {e}")
                    pass
    return results

directory_to_check = 'd:/code/klypso'
print(f"Searching for images in {directory_to_check}...")
all_results = find_urls_in_dir(directory_to_check)

unique_tests = {}
for url, filepath in all_results:
    if url not in unique_tests:
        unique_tests[url] = filepath

print(f"Found {len(unique_tests)} unique image URLs to check.")

broken_images = []
for url, filepath in unique_tests.items():
    if not url.startswith('http'):
        continue
    status = check_url(url)
    if status:
        broken_images.append(f"{status}: {url} (in {filepath})")

if broken_images:
    print("\n--- BROKEN IMAGES FOUND ---")
    for img in broken_images:
        print(img)
else:
    print("\nNo broken images found.")
