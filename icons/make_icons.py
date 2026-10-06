# -*- coding: utf-8 -*-
"""アプリアイコンを作る。翠の地に「汉」。
   フォントを入れ替えたいときは CANDIDATES を書き換えて再実行する。
     python icons/make_icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

JADE = (21, 101, 90, 255)
PAPER = (255, 255, 255, 255)
GLYPH = "汉"

CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",   # Microsoft YaHei Bold
    r"C:\Windows\Fonts\msyh.ttc",     # Microsoft YaHei
    r"C:\Windows\Fonts\simhei.ttf",   # SimHei
    r"C:\Windows\Fonts\simsun.ttc",   # SimSun
    r"C:\Windows\Fonts\YuGothB.ttc",  # Yu Gothic Bold
    r"C:\Windows\Fonts\meiryob.ttc",  # Meiryo Bold
]


def load_font(size):
    for path in CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return None


def rounded(size, radius_ratio):
    """角丸の翠の板を返す。"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=JADE)
    return img


def draw_glyph(img, box_ratio):
    """中央に「汉」を置く。box_ratio は字を収める正方形の割合。"""
    size = img.size[0]
    d = ImageDraw.Draw(img)
    target = int(size * box_ratio)
    font = load_font(target)
    if font is None:
        # フォントが無い環境では、筆画の代わりに三本線の記号を置く
        w = int(size * 0.07)
        y = size * 0.33
        for i in range(3):
            d.rounded_rectangle(
                [size * 0.26, y - w / 2, size * 0.74, y + w / 2],
                radius=w // 2, fill=PAPER,
            )
            y += size * 0.17
        return img

    # 実際の字面で中央に合わせる
    l, t, r, b = d.textbbox((0, 0), GLYPH, font=font)
    gw, gh = r - l, b - t
    x = (size - gw) / 2 - l
    y = (size - gh) / 2 - t
    d.text((x, y), GLYPH, font=font, fill=PAPER)
    return img


def main():
    # 通常アイコン: 角丸、字は大きめ
    base = draw_glyph(rounded(512, 0.22), 0.60)
    base.save(os.path.join(HERE, "icon-512.png"))
    base.resize((192, 192), Image.LANCZOS).save(os.path.join(HERE, "icon-192.png"))
    base.resize((180, 180), Image.LANCZOS).save(os.path.join(HERE, "icon-180.png"))

    # マスカブル: 全面を塗り、字は内側 60% に収める
    full = Image.new("RGBA", (512, 512), JADE)
    draw_glyph(full, 0.44).save(os.path.join(HERE, "icon-maskable-512.png"))

    # ファビコン
    base.resize((32, 32), Image.LANCZOS).save(os.path.join(HERE, "favicon-32.png"))

    print("書き出しました:", ", ".join(sorted(
        f for f in os.listdir(HERE) if f.endswith(".png")
    )))
    print("使用フォント:", next((p for p in CANDIDATES if os.path.exists(p)), "なし（代替図形）"))


if __name__ == "__main__":
    main()
