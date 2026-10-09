"""把 assets/img 里的 PNG 压成 JPG，控制站点体积。
用法：python tools/compress_images.py
"""
import glob
import os
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(HERE, "assets", "img")
MAX_EDGE = 1600
QUALITY = 82


def main():
    files = sorted(glob.glob(os.path.join(IMG_DIR, "*.png")))
    if not files:
        print("没有找到 PNG 文件。")
        return
    for f in files:
        im = Image.open(f).convert("RGB")
        w, h = im.size
        if max(w, h) > MAX_EDGE:
            r = MAX_EDGE / max(w, h)
            im = im.resize((int(w * r), int(h * r)), Image.LANCZOS)
        out = os.path.splitext(f)[0] + ".jpg"
        im.save(out, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        old = os.path.getsize(f) // 1024
        new = os.path.getsize(out) // 1024
        print(f"{os.path.basename(out):<16} {old:>6} KB -> {new:>5} KB")
        os.remove(f)


if __name__ == "__main__":
    main()
