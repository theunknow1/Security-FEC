from PIL import Image, ImageDraw
def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), (6, 8, 13, 255))
    draw = ImageDraw.Draw(img)
    margin = size // 8
    draw.ellipse([margin, margin, size - margin, size - margin], outline=(0, 210, 255, 255), width=size//32)
    center = size // 2
    r = size // 5
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(0, 210, 255, 220))
    img.save(filename)
create_icon(192, r'C:\Users\usuario\.gemini\antigravity\scratch\sentinel\icon-192.png')
create_icon(512, r'C:\Users\usuario\.gemini\antigravity\scratch\sentinel\icon-512.png')
print('Icons created successfully!')
