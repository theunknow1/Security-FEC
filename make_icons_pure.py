    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # Filter byte
        for x in range(width):
            # Draw a circle inside
            dx = x - width / 2
            dy = y - height / 2
            dist_sq = dx*dx + dy*dy
            r_outer = (width / 2) * 0.9
            r_inner = (width / 2) * 0.7
            if r_inner*r_inner <= dist_sq <= r_outer*r_outer:
                raw_data.extend([r, g, b])
            elif dist_sq <= (r_inner * 0.5)**2:
                raw_data.extend([r, g, b])
            else:
                raw_data.extend([6, 8, 13])
                
    compressed = zlib.compress(raw_data)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND')
    png += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    return bytes(png)
with open(r'C:\Users\usuario\.gemini\antigravity\scratch\sentinel\icon-192.png', 'wb') as f:
    f.write(make_png(192, 192))
with open(r'C:\Users\usuario\.gemini\antigravity\scratch\sentinel\icon-512.png', 'wb') as f:
    f.write(make_png(512, 512))
print('Icons created successfully with pure Python standard library!')
