import os
from PIL import Image, ImageDraw

ascii_qr = """
 ▄▄▄▄▄▄▄ ▄ ▄ ▄  ▄▄ ▄▀▄  ▄ ▄▄▄▄▄▄▄ 
 █ ▄▄▄ █ ▄▀▄ ▄█▄██ ▄▄█▀▀█ █ ▄▄▄ █ 
 █ ███ █ ██▀   █▄▀███▀▄▀▄ █ ███ █ 
 █▄▄▄▄▄█ ▄ █▀█ █ █ ▄ █▄▄█ █▄▄▄▄▄█ 
 ▀▀▀▀▀▀▀ █▀█ █▀▀▀▀ ▀▄█ ▀▄ ▀▀▀▀▀▀▀ 
 ▀▄ █ █▄▄ ▀ ▀▀█▀▄  ▀▄  ▀ ██▀ ▄██▀▄▄█▄▄█▄  ▄ ▄  █▄▄▄▄ █▀▄▀▀▄▄▀█ 
  ▀█▀▄▀▄▄▄▀▄  ▄█▄▄█ ▄█    ▀ ▀██▀█▀  ▀▀█ ▄▄█▀█  ▄█▄█ ▀ ▄▀ ▀█▄▀▄ 
 ▄▀▄▄▀▀▄ █ ▄▀▀▄█▀▀▄██▀▀▄█ ▀   ▄▀ ▀█ ██ █▀ ▀█▄▀ ▄█▄▄▄▀▄▄█▄ ▄ █▀ 
 ▄▄█▀▀▄▄▀▄█▀  ▀▄ ▄▀██▄▀▀  █▄ ▀▀ ▀▀▄ ▄ ▀  ▀█▀█▄ ▄ ▀█▄ ▄▀▀▄▀ █▄█ 
  ▀▀▀ ▄▄▀▄▀▄█▀▀▄▄▀▄█▀▀▀█▄██▀▀ ▀▄ █ ▀█▄▀▄  ██▄ ▀ ▀▄█ ▄▄ ▄▀▀▄ ▀▀ 
 ▀ ▀▀▄▄▄▄█▄▄ ▀█▀█▀ ▀ █▄▀▄█▄ ▀▄█ ▄▄█ █▄▀▄▀███ █   ▄▀  ▄▀▀▀▀ ▀▄█ 
 ██▄ ▄█▄▄▄█▀██▄ ▀ █▀ ▀█▀ █▀▀ ▄██▄█ ▀███▄  ▄▄ ▀  █▄▄▄█▄▄▄███▄█▀ 
 ▀▄  █ ▄ █ ▀▀  █ ▀█▄▄ ▀▄▀█▀█▄█ ▄ █▄▄█▄▀▄▄▄█▀▄█  ███▄ █ ▄ █▄▀█▄ 
 █ ▀▀█▄▄▄██▀███ ▀▄▀▄▄▀█ ▀█▀  █▄▄▄█  █▄  ▀  ▄█▀▀ ▄▄████▄▄▄█▀▄▀▀ 
 ▀▀▀▀▄ ▄▀▀▀▄▀▀ █▄ █  █▀ ██▀█▄▀▀▀██▄ ▀█▀▄▄███▀▄▄ ▀▀▀ ▄▀██▀▄▄█▀▄ 
 █ █ █▀▄▄██▄▀▀▄ ▄▄   ▄█ ▄ ▄▀▀  ██   █▄▄ ▀ ▄▄▄ █▄██ ▄██▄▄▀ ▄  ▀ 
  ▄ ▄▄▄▄ ▄▄ ▀ ▀ ▄██▀██▀███▄▄▄▀▀▄▀  ▄▀▄▀▄▀ ███  ▄▄█▄▄▄█▄▄█▄█ ▄  
 ▀ █▄▄▄▄    ▄▀▀█▄▄██ █▄  █▄█▄  ▄▀▄▄ ▄█▀█▀▀▀▀▄▀ ▄▀▄▀▄▄▄▄██▄▀▄ █ 
  ▄▄█▀▀▄▀    ▀▄ ▀▄▀▄██▀▀▀   ██▄ ▄▄ ▄███ ▄▀█▀▄▀ ▄▄█ ▄█▀██▄  ▀▄▄ 
 ██ ▀▀ ▄█ ▀▀   █▀ ▄▄ ▄▄ ▀ █ ▀▀▀█▀ ▄█▀▄▄▄▀▀▀▀▄ ▀ ▄████▀▄ ▄█  ▄▀ 
 ▄█▀██ ▄▄██ ▄  █▀▄▄▀▄▄ ███▀ ▀▀ ▄  ▄▀▄ ▀ ▄█▄▀ ▄▄▄▀██ █████▄▄▀▄▄ 
 ▄▀▄ ██▄███ ▀█▄ ▄█ ▀█ ▄█▀█▄  ▀▀██▄ ▄▄██ ▀ ▄▄▄ ▀ ▄▄▄ ▄ ▀▀▄▄▀▄   
 ▀▀▄▄▄█▄ █▀   ▀██▀█ ▀ ▀▄▀█▄██▀▀█▄▀▄ ▀▄█ ▀███▄█▄  ▀█ ▄█▄█▀ ▀▀█▄ 
 ███▄▀ ▄█ ▀█▀▀▀ ███▄ ▀█▀▀ ▀ ▀███▄▄██▀▄▀▀▀▀█▀▄ ▀▀▄█▄▀▄██▄█▄  ▀▄ 
 ▄▄▄▄▄▄▄ ▀▄    ▄ ▀▀█▄▄█▀▀█▄█ █ ▄ █▀▄▄█▀▄▀▀▀█▄▄▄ ▀▄▀ ▄█ ▄ █▄▄▄█ 
 █ ▄▄▄ █ ██▀▄█▀█▀▄█▀█▀█▄█▀▀ ▄█▄▄▄██▀▀▄▄█▄▀██▀▀▀▀█▄ ▀▀█▄▄▄█▄  ▄ 
 █ ███ █ █▀▀▀▄█▄▄▀█▀ ▄▀  ▀▀▀ █▀█▀ ▄▄██▀ █  ▀▀▄  ▀▀▀▄  ▀██  ▄ █ 
 █▄▄▄▄▄█ ▄█▀█ ▄ █ ▄▄ ██ ▄█▀  ▀█▀█▀▀ █▄▀▄ ▀██▀▀█▀████ █▀██   ▄█ 
 ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
"""

lines = [line for line in ascii_qr.split('\n') if line]

# Width is the length of the longest line.
width = max(len(line) for line in lines)
# Height is number of lines * 2 (each character represents 2 vertical pixels)
height = len(lines) * 2

# Scale factor for the image to make it readable
scale = 10

# Add padding
padding = 4
img_width = (width + 2 * padding) * scale
img_height = (height + 2 * padding) * scale

img = Image.new('RGB', (img_width, img_height), color='white')
draw = ImageDraw.Draw(img)

for y, line in enumerate(lines):
    # Pad line to max width
    line = line.ljust(width, ' ')
    for x, char in enumerate(line):
        top_color = 'white'
        bottom_color = 'white'
        
        if char == '█':
            top_color = 'black'
            bottom_color = 'black'
        elif char == '▄':
            top_color = 'white'
            bottom_color = 'black'
        elif char == '▀':
            top_color = 'black'
            bottom_color = 'white'
        elif char == ' ':
            top_color = 'white'
            bottom_color = 'white'
            
        # Draw top pixel
        draw.rectangle([
            (x + padding) * scale, (y * 2 + padding) * scale,
            (x + padding + 1) * scale - 1, (y * 2 + padding + 1) * scale - 1
        ], fill=top_color)
        
        # Draw bottom pixel
        draw.rectangle([
            (x + padding) * scale, (y * 2 + 1 + padding) * scale,
            (x + padding + 1) * scale - 1, (y * 2 + 1 + padding + 1) * scale - 1
        ], fill=bottom_color)

out_path = '/Users/chris/.gemini/antigravity/brain/c4763a13-38a6-4109-9438-27723b95695d/artifacts/qr.png'
img.save(out_path)
print(f"Saved QR code to {out_path}")
