# -*- coding: utf-8 -*-
# 把 assets/tiles/riichimaj/ 里的单牌图压成 WebP，存到 assets/img/tiles/
#   - 竖 vertical / 横 horizontal / 槓 kan / 背面 back  -> assets/img/tiles/
#   - 其他 other（通配牌 + 示意卡，全是整图）        -> assets/img/tiles/other/
# 文件名统一转小写 ASCII；原地不动任何原图。
# 用法：<隔离环境 python> tools/compress_tiles.py
import io, os, shutil, struct
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "tiles", "riichimaj")
DST = os.path.join(ROOT, "assets", "img", "tiles")

# 只转这三类「纯牌」到 tiles 根目录；other 单独进子目录（含示意卡整图）
FLAT_DIRS = ["竖 vertical", "横 horizontal", "槓 kan", "背面 back"]
OTHER_DIR = "其他 other"

# ★改这里：画质开关
#   True  = 无损 WebP（像素级与原图完全一致，永不降画质）—— 默认
#   False = 有损（quality=QUALITY），只有极端追求体积时才开
LOSSLESS = True
QUALITY = 80  # 仅 LOSSLESS=False 时生效

# ★改这里：分辨率上限。None = 完全保留原图分辨率（最清晰，3x/4x 屏都不糊）；
#   给数字则按长边等比缩（会损失细节，一般不用）。
#   配合 LOSSLESS=True，体积只由画面内容决定 —— 实测 170 张无损仅 1.29MB（原 PNG 5.7MB）。
MAX_EDGE = None

# 原图尺寸有 ±1~2px 抖动（272 vs 271、301 vs 302），会导致每张牌宽高比差一点，
# 排列时出现亚像素缝隙。下面按「形状」统一到标准画布再等比缩放：
#   竖牌 272×389（按高缩放） / 横牌 360×301 / 杠图 360×569（都按长边缩放）
# 形状由 _shape_of(宽,高) 用宽高比判断，不依赖目录名，所以背面目录里
# 混着的竖/横/杠三种版式也能各自归位。


def normalize(im, size):
    """把图放进 size 画布 —— 只补白、尽量不缩放。

    原素材各张之间有 ±1~2px 抖动（271 vs 272），若不统一，每张牌渲染出的
    宽度会差 0.x px、排列时出现亚像素缝隙。这里把它们归到同一画布。
    关键是：原图比画布小时**只做居中粘贴，绝不放大** —— 零重采样，画质零损失；
    只有原图比画布大时才等比缩小（本素材不会发生）。
    """
    if not size:
        return im
    tw, th = size
    if im.size == (tw, th):
        return im
    mode = "RGBA" if im.mode == "RGBA" else "RGB"
    if im.width <= tw and im.height <= th:
        canvas = Image.new(mode, (tw, th), (0, 0, 0, 0) if mode == "RGBA" else (255, 255, 255))
        canvas.paste(im, ((tw - im.width) // 2, (th - im.height) // 2))
        return canvas
    # 比画布大：等比缩进去（无损模式下也很少走到这条分支）
    scale = min(tw / im.width, th / im.height)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new(mode, (tw, th), (0, 0, 0, 0) if mode == "RGBA" else (255, 255, 255))
    canvas.paste(im, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def to_rgba(im):
    """保留透明通道 —— 原素材 170 张全是 RGBA（牌外透明）。
    不合成白/米色底：否则夜间模式（深色背景）下每张牌会顶着一块亮色方块。"""
    if im.mode in ("RGBA", "LA", "P"):
        return im.convert("RGBA")
    return im.convert("RGB")


def conv(src_path, dst_path, norm_size, axis="long"):
    """转一张图。默认无损 + 保留原分辨率，画质与原 PNG 逐像素一致。"""
    im = to_rgba(Image.open(src_path))
    im = normalize(im, norm_size)  # 只补透明边，不缩放（见 normalize 注释）
    if MAX_EDGE and max(im.size) > MAX_EDGE:
        k = MAX_EDGE / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    buf = io.BytesIO()
    if LOSSLESS:
        # exact=True = 逐字节严格无损（含透明通道，解压后与原图 100% 相同）。
        # 实测它比 exact=False 还小（1.29MB vs 1.47MB）：保留原始 RGB 反而更好压缩。
        im.save(buf, "WEBP", lossless=True, method=6, exact=True)
    else:
        im.save(buf, "WEBP", quality=QUALITY, method=6)
    data = buf.getvalue()
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    with open(dst_path, "wb") as f:
        f.write(data)
    return im.size, os.path.getsize(src_path), len(data)


def main():
    if not os.path.isdir(SRC):
        print("找不到源目录：", SRC)
        return
    if os.path.isdir(DST):
        shutil.rmtree(DST)
    os.makedirs(DST, exist_ok=True)

    build_canvas()  # 先按素材定好三种形状的画布上限（只补白、不缩放）
    print("画布上限：竖牌 %s  横牌 %s  杠图 %s\n" % (CANVAS["vt"], CANVAS["hz"], CANVAS["kan"]))

    before = after = 0
    count = 0
    groups = []

    # --- 1. 竖/横/槓/背面：直接铺在 assets/img/tiles/ 下 ---
    for d in FLAT_DIRS:
        p = os.path.join(SRC, d)
        if not os.path.isdir(p):
            continue
        files = sorted(f for f in os.listdir(p) if f.lower().endswith(".png"))
        if not files:
            continue
        # 统一画布：按「形状」归类（竖/横/杠各自标准画布），互不干扰
        by_shape = _group_by_size(p, files)
        n0, a0 = before, after
        for (shape, size, axis), names in by_shape.items():
            for name in names:
                out = os.path.splitext(name)[0].lower() + ".webp"
                sz, b, a = conv(os.path.join(p, name), os.path.join(DST, out), size, axis)
                before += b
                after += a
                count += 1
        groups.append((d, len(files), before - n0, after - a0))

    # --- 2. 其他：牌背/通配牌按牌的形状规范化；示意卡保持原样 ---
    p = os.path.join(SRC, OTHER_DIR)
    if os.path.isdir(p):
        files = sorted(f for f in os.listdir(p) if f.lower().endswith(".png"))
        # 这几个是「真牌」：牌背 b/hb + 通配 any*/，要跟竖牌同尺寸才对齐
        CARD_TILES = {"b", "hb", "any", "anym", "anyp", "anys", "anyz"}
        n0, a0 = before, after
        for name in files:
            stem = os.path.splitext(name)[0].lower()
            out = stem + ".webp"
            if stem in CARD_TILES:
                with open(os.path.join(p, name), "rb") as f:
                    head = f.read(33)
                w, h = struct.unpack(">II", head[16:24])
                _, size, axis = _shape_of(w, h)
            else:
                size, axis = None, "long"  # 示意卡整图，只缩不放画布
            sz, b, a = conv(os.path.join(p, name), os.path.join(DST, "other", out), size, axis)
            before += b
            after += a
            count += 1
        if files:
            groups.append((OTHER_DIR, len(files), before - n0, after - a0))

    mode = "无损 WebP（像素级等同原图）" if LOSSLESS else f"有损 WebP q={QUALITY}"
    print("分类                   张数     原大小    压缩后")
    for name, n, b, a in groups:
        print(f"  {name:<18} {n:>3}  {b/1024:>8.0f}KB  {a/1024:>7.0f}KB")
    print(f"\n共 {count} 张：{before/1048576:.2f}MB → {after/1048576:.2f}MB"
          f"（省了 {(1 - after / before) * 100:.0f}%）")
    print("模式：", mode)
    print("分辨率：", "保留原图" if not MAX_EDGE else f"长边 ≤ {MAX_EDGE}px")
    print("输出目录：", DST)


# 三种形状的原尺寸（脚本启动时按素材自动算上限，见 build_canvas）：
#   竖牌 272×389 / 横牌 360×302 / 杠图 360×569
CANVAS = {"vt": (272, 389), "hz": (360, 302), "kan": (360, 569)}

# ★改这里：离群值容差(px)。素材里若有尺寸明显跑偏的图（如背面目录那张 360×341），
#   超过这个差值就不参与画布统计，免得把整组牌的画布撑大、导致牌面缩小。
OUTLIER_PX = 5


def build_canvas():
    """扫描素材，把每种形状的画布取成「组内尺寸上限」，从而只补白、不缩放。

    注意要剔掉离群值：背面目录里混着一张 360×341 的特例（b_04），
    若把它算进横牌上限，正常横牌会被迫补 40px 透明边、牌面相对缩小。
    做法：只把与组内中位数差 ≤ OUTLIER_PX 的尺寸纳入统计。"""
    import statistics

    boxes = {}
    for d in FLAT_DIRS:
        p = os.path.join(SRC, d)
        if not os.path.isdir(p):
            continue
        for name in os.listdir(p):
            if not name.lower().endswith(".png"):
                continue
            with open(os.path.join(p, name), "rb") as f:
                head = f.read(33)
            w, h = struct.unpack(">II", head[16:24])
            boxes.setdefault(_shape_key(w, h), []).append((w, h))

    for shape, sizes in boxes.items():
        if shape not in CANVAS:
            continue
        mw = statistics.median([s[0] for s in sizes])
        mh = statistics.median([s[1] for s in sizes])
        keep = [(w, h) for (w, h) in sizes
                if abs(w - mw) <= OUTLIER_PX and abs(h - mh) <= OUTLIER_PX]
        if keep:
            CANVAS[shape] = (max(w for w, _ in keep), max(h for _, h in keep))
    return CANVAS


def _shape_key(w, h):
    """按宽高比判断形状：竖牌 ~0.70 横牌 ~1.19 杠图 ~0.63"""
    r = w / h
    if r > 1.05:
        return "hz"
    if r < 0.68:
        return "kan"
    return "vt"


def _shape_of(w, h):
    """→ (形状名, 标准画布, 缩放轴)。画布取组内上限，只补白不缩放。"""
    k = _shape_key(w, h)
    return k, CANVAS[k], ("tall" if k == "vt" else "long")


def _group_by_size(folder, files):
    """按「形状」归类到标准画布 —— 不按像素分组。
    原图有 ±1~2px 抖动，按像素分会归出好几类、结果不一致；
    按宽高比则稳定，且能把背面目录里混着的三种版式各自归位。"""
    out = {}
    for name in files:
        with open(os.path.join(folder, name), "rb") as f:
            head = f.read(33)
        w, h = struct.unpack(">II", head[16:24])
        key = _shape_of(w, h)
        out.setdefault(key, []).append(name)
    return out


main()
