"""
1Oak Lending — Meta Ad Image Generator
Produces PNG files for all 5 ad sets at 1080x1080 (feed) and select 1080x1920 (stories)
"""

from PIL import Image, ImageDraw, ImageFont
import math, os

# ── Brand tokens ──────────────────────────────────────────────────────────────
FOREST      = (35,  44,  23)   # #232c17
FOREST_DEEP = (25,  31,  16)   # #191f10
TAN         = (228, 195, 134)  # #e4c386
CREAM       = (250, 250, 248)  # #fafaf8
CREAM_DARK  = (243, 240, 235)  # #f3f0eb
GREY_MID    = (180, 174, 165)  # inactive states colour
RED_ALERT   = (200,  60,  50)
WHITE       = (255, 255, 255)
BLACK       = (0,   0,   0)

# ── Fonts ─────────────────────────────────────────────────────────────────────
F = "C:/Windows/Fonts/"
def font(name, size):
    try:    return ImageFont.truetype(F + name, size)
    except: return ImageFont.load_default()

# serif display (closest to Quattrocento)
def f_serif(size):      return font("georgiab.ttf",  size)
def f_serif_reg(size):  return font("georgia.ttf",   size)
# condensed bold (closest to Barlow Condensed)
def f_cond(size):       return font("impact.ttf",    size)
# mono (closest to Fragment Mono)
def f_mono(size):       return font("consola.ttf",   size)
def f_mono_b(size):     return font("consolab.ttf",  size)
# body
def f_body(size):       return font("calibri.ttf",   size)
def f_body_b(size):     return font("calibrib.ttf",  size)

OUT = os.path.dirname(os.path.abspath(__file__))

# ── Helpers ───────────────────────────────────────────────────────────────────
def new_img(w=1080, h=1080, bg=FOREST_DEEP):
    img = Image.new("RGB", (w, h), bg)
    return img, ImageDraw.Draw(img)

def cx_text(draw, text, y, font, color, w=1080, offset_x=0):
    """Draw text centred horizontally."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (w - tw) // 2 + offset_x
    draw.text((x, y), text, font=font, fill=color)
    return bbox[3] - bbox[1]  # return height

def wrap_text(draw, text, x, y, max_w, font, color, line_spacing=1.35):
    """Naive word-wrap."""
    words = text.split()
    line, lines = [], []
    for w in words:
        test = " ".join(line + [w])
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_w and line:
            lines.append(" ".join(line))
            line = [w]
        else:
            line.append(w)
    if line:
        lines.append(" ".join(line))
    lh = draw.textbbox((0,0),"Ag",font=font)[3] * line_spacing
    for ln in lines:
        draw.text((x, y), ln, font=font, fill=color)
        y += lh
    return y

def wordmark(draw, x, y, size=28, color=TAN):
    """Draw 1OAK LENDING wordmark."""
    f1 = f_mono_b(size)
    draw.text((x, y), "1OAK LENDING", font=f1, fill=color)

def bottom_bar(img, draw, label="", w=1080, h=1080):
    """Thin tan rule + wordmark at bottom."""
    draw.rectangle([(60, h-80), (w-60, h-78)], fill=(*TAN, 120))
    wordmark(draw, 60, h-65, size=22)
    if label:
        f = f_mono(18)
        bbox = draw.textbbox((0,0), label, font=f)
        draw.text((w - 60 - (bbox[2]-bbox[0]), h-65), label, font=f, fill=(*TAN[:3], 160) if len(TAN)==4 else TAN)

def rule_v(draw, x, y1, y2, color=TAN, width=3):
    draw.rectangle([(x, y1), (x+width, y2)], fill=color)

def rule_h(draw, y, x1, x2, color=TAN, width=2):
    draw.rectangle([(x1, y), (x2, y+width)], fill=color)

def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path, "PNG", quality=95)
    print(f"  saved: {name}")

# ══════════════════════════════════════════════════════════════════════════════
# AD SET 1 — "Broker Paycheck"  (1080×1080 feed)
# ══════════════════════════════════════════════════════════════════════════════
def ad1_feed():
    img, d = new_img(bg=FOREST_DEEP)

    # subtle texture — diagonal hatching
    for i in range(-1080, 2160, 18):
        d.line([(i, 0), (i+1080, 1080)], fill=(255,255,255,8), width=1)

    # eyebrow
    ey = f_mono(20)
    cx_text(d, "REFERRAL & BROKER PROGRAM", 90, ey, (*TAN[:3],))

    # rule
    rule_h(d, 130, 220, 860)

    # large dollar figure
    d_font = f_cond(260)
    cx_text(d, "$25,000", 170, d_font, TAN)

    # sub label
    cx_text(d, "ON A $2.5M DEAL", 448, f_mono_b(32), CREAM)

    rule_h(d, 508, 320, 760, color=GREY_MID, width=1)

    # feature bullets
    bullets = [
        "1% REFERRAL FEE · FUNDED AT CLOSING",
        "NO ORIGINATION WORK REQUIRED",
        "WE HANDLE THE FINANCING",
    ]
    y = 535
    for b in bullets:
        bf = f_mono(22)
        bbox = d.textbbox((0,0), b, font=bf)
        bw = bbox[2]-bbox[0]
        x0 = (1080-bw)//2
        d.ellipse([(x0-22, y+6),(x0-8, y+20)], fill=TAN)
        d.text((x0, y), b, font=bf, fill=CREAM)
        y += 52

    # cta pill
    pill_y = 740
    pill_w, pill_h = 420, 60
    px = (1080-pill_w)//2
    d.rounded_rectangle([(px, pill_y),(px+pill_w, pill_y+pill_h)], radius=6, fill=TAN)
    cta_f = f_body_b(26)
    cx_text(d, "BECOME A PARTNER →", pill_y+16, cta_f, FOREST_DEEP)

    # footnote
    cx_text(d, "CRE BRIDGE & VALUE-ADD LENDING · $1M–$25M", 840, f_mono(18), GREY_MID)

    bottom_bar(img, d)
    save(img, "ad1_broker_paycheck_feed.png")

# ══════════════════════════════════════════════════════════════════════════════
# AD SET 2 — "Your Bank Said No"  (3 carousel cards 1080×1080)
# ══════════════════════════════════════════════════════════════════════════════
def ad2_carousel():
    # Card 1 — "YOUR BANK SAID NO."
    img, d = new_img(bg=(18, 18, 18))
    cx_text(d, "YOUR BANK", 200, f_cond(180), WHITE)
    cx_text(d, "SAID NO.", 370, f_cond(180), WHITE)

    # red X
    cx, cy, r = 540, 650, 90
    d.ellipse([(cx-r, cy-r),(cx+r, cy+r)], outline=RED_ALERT, width=6)
    d.line([(cx-55, cy-55),(cx+55, cy+55)], fill=RED_ALERT, width=10)
    d.line([(cx+55, cy-55),(cx-55, cy+55)], fill=RED_ALERT, width=10)

    cx_text(d, "CONVENTIONAL LENDING PASSED.", 790, f_mono(22), GREY_MID)
    bottom_bar(img, d, label="1 / 3")
    save(img, "ad2_bank_said_no_card1.png")

    # Card 2 — "WE SAID YES."
    img, d = new_img(bg=FOREST)
    cx_text(d, "WE SAID", 160, f_cond(170), CREAM)
    cx_text(d, "YES.", 320, f_cond(170), TAN)

    rule_h(d, 490, 120, 960)

    stats = [
        ("$4.2M",      "BRIDGE LOAN"),
        ("28 DAYS",    "TO CLOSE"),
        ("MULTIFAMILY","CONVERSION"),
    ]
    col_w = 1080 // 3
    for i, (big, small) in enumerate(stats):
        cx_i = col_w * i + col_w // 2
        bf = f_cond(62)
        sf = f_mono(20)
        bx = cx_i - (d.textbbox((0,0),big,font=bf)[2])//2
        d.text((bx, 530), big, font=bf, fill=TAN)
        sx = cx_i - (d.textbbox((0,0),small,font=sf)[2])//2
        d.text((sx, 604), small, font=sf, fill=CREAM)
        if i < 2:
            rule_v(d, col_w*(i+1)-2, 510, 650, color=(*TAN[:3],), width=1)

    cx_text(d, "INDIANAPOLIS, IN  ·  EXAMPLE DEAL", 700, f_mono(19), GREY_MID)

    bottom_bar(img, d, label="2 / 3")
    save(img, "ad2_bank_said_no_card2.png")

    # Card 3 — Features
    img, d = new_img(bg=CREAM_DARK)
    cx_text(d, "HOW WE LEND.", 100, f_cond(120), FOREST_DEEP)
    rule_h(d, 230, 80, 1000, color=FOREST, width=2)

    features = [
        ("ASSET-BASED",         "We underwrite the deal, not the borrower."),
        ("NON-RECOURSE",        "Your personal assets stay off the table."),
        ("NO INCOME VERIFY",    "No W2s. No tax returns. Just the deal."),
        ("30-DAY CLOSE",        "We move when your contract requires it."),
    ]
    y = 270
    for title, desc in features:
        d.rectangle([(80, y),(84, y+60)], fill=TAN)
        d.text((100, y+4), title, font=f_mono_b(26), fill=FOREST_DEEP)
        d.text((100, y+36), desc, font=f_body(24), fill=FOREST)
        y += 100

    # pill
    pill_y = 820
    pill_w, pill_h = 460, 62
    px = (1080-pill_w)//2
    d.rounded_rectangle([(px, pill_y),(px+pill_w, pill_y+pill_h)], radius=6, fill=FOREST_DEEP)
    cx_text(d, "GET A TERM SHEET →", pill_y+17, f_body_b(26), TAN)

    bottom_bar(img, d, label="3 / 3")
    save(img, "ad2_bank_said_no_card3.png")

# ══════════════════════════════════════════════════════════════════════════════
# AD SET 3 — "Value-Add Operators"  (1080×1080 feed)
# ══════════════════════════════════════════════════════════════════════════════
def ad3_feed():
    img, d = new_img(bg=(28, 24, 20))

    # Left half — "BEFORE" (muted warm dark)
    d.rectangle([(0,0),(535,1080)], fill=(42, 36, 28))
    # Right half — forest green
    d.rectangle([(545,0),(1080,1080)], fill=FOREST)
    # Gold vertical rule
    rule_v(d, 535, 0, 1080, color=TAN, width=10)

    # BEFORE label
    d.text((50, 60), "BEFORE", font=f_mono_b(24), fill=GREY_MID)
    d.text((50, 98), "CLASS C · VACANT", font=f_mono(19), fill=(*GREY_MID,))

    # AFTER label
    d.text((560, 60), "AFTER", font=f_mono_b(24), fill=TAN)
    d.text((560, 98), "STABILISED · PERFORMING", font=f_mono(19), fill=CREAM)

    # Left — problem stack
    ly = 220
    left_items = [
        ("DEFERRED MAINTENANCE", RED_ALERT),
        ("HIGH VACANCY", RED_ALERT),
        ("BELOW-MARKET RENTS", RED_ALERT),
        ("PASSED ON BY BANKS", RED_ALERT),
    ]
    for label, col in left_items:
        d.rectangle([(60, ly+8),(74, ly+22)], fill=col)
        d.text((84, ly), label, font=f_body(24), fill=col)
        ly += 60

    # Right — solution stack
    ry = 220
    right_items = [
        "BRIDGE LOAN FUNDED",
        "RENOVATION COMPLETE",
        "FULLY LEASED",
        "REFINANCED AT EXIT",
    ]
    for label in right_items:
        d.rectangle([(560, ry+8),(574, ry+22)], fill=TAN)
        d.text((584, ry), label, font=f_body(24), fill=CREAM)
        ry += 60

    # Centre bottom — CTA overlay
    d.rectangle([(0, 780),(1080, 1080)], fill=(*FOREST_DEEP, 230))
    cx_text(d, "1OAK FUNDED THE BRIDGE.", 820, f_cond(72), TAN)
    cx_text(d, "$1M – $25M  ·  30-DAY CLOSE  ·  ASSET-BASED", 910, f_mono(22), CREAM)

    pill_y = 970
    pill_w, pill_h = 400, 58
    px = (1080-pill_w)//2
    d.rounded_rectangle([(px, pill_y),(px+pill_w, pill_y+pill_h)], radius=6, fill=TAN)
    cx_text(d, "SUBMIT YOUR DEAL →", pill_y+15, f_body_b(26), FOREST_DEEP)

    save(img, "ad3_value_add_feed.png")

# ══════════════════════════════════════════════════════════════════════════════
# AD SET 4 — "Broker Social Proof"  (1080×1080 feed)
# ══════════════════════════════════════════════════════════════════════════════
def ad4_feed():
    img, d = new_img(bg=FOREST)

    # Top eyebrow
    cx_text(d, "WHY BROKERS PARTNER WITH 1OAK", 70, f_mono(22), TAN)
    rule_h(d, 114, 60, 1020)

    stats = [
        ("1%",          "REFERRAL FEE",        "OF FUNDED LOAN AMOUNT"),
        ("14",          "ACTIVE MARKETS",       "MIDWEST · SE · MOUNTAIN WEST"),
        ("48 HRS",      "TERM SHEET",           "FROM COMPLETE SUBMISSION"),
        ("30 DAYS",     "TO CLOSE",             "FROM SIGNED TERM SHEET"),
    ]

    y = 140
    row_h = 174
    for big, mid, small in stats:
        # left accent rule
        d.rectangle([(60, y+8),(66, y+row_h-16)], fill=TAN)
        # big number
        d.text((90, y+6), big, font=f_cond(110), fill=TAN)
        # mid label
        bbox = d.textbbox((0,0), big, font=f_cond(110))
        offset = bbox[2] - bbox[0] + 110
        d.text((offset, y+18), mid, font=f_mono_b(28), fill=CREAM)
        d.text((offset, y+58), small, font=f_mono(19), fill=GREY_MID)
        rule_h(d, y+row_h-4, 60, 1020, color=(*FOREST_DEEP,), width=1)
        y += row_h

    # CTA
    rule_h(d, 846, 60, 1020)
    cx_text(d, "NO ORIGINATION WORK. NO LOAN MANAGEMENT. JUST A CHECK AT CLOSE.", 868, f_mono(18), GREY_MID)

    pill_w, pill_h = 460, 62
    px = (1080-pill_w)//2
    d.rounded_rectangle([(px, 920),(px+pill_w, 920+pill_h)], radius=6, fill=TAN)
    cx_text(d, "JOIN THE PARTNER PROGRAM ->", 935, f_body_b(26), FOREST_DEEP)

    save(img, "ad4_broker_social_proof_feed.png")

# ══════════════════════════════════════════════════════════════════════════════
# AD SET 5 — "Time Kills Deals"  (1080×1080 feed)
# ══════════════════════════════════════════════════════════════════════════════
def draw_clock(d, cx, cy, r, color_face, color_hand, color_ring):
    """Draw an analog clock face near midnight (11:57)."""
    # outer ring
    d.ellipse([(cx-r, cy-r),(cx+r, cy+r)], outline=color_ring, width=5)
    # inner fill
    d.ellipse([(cx-r+6, cy-r+6),(cx+r-6, cy+r-6)], fill=color_face)
    # tick marks
    for i in range(12):
        angle = math.radians(i * 30 - 90)
        inner = r - 22 if i % 3 == 0 else r - 14
        x1 = cx + inner * math.cos(angle)
        y1 = cy + inner * math.sin(angle)
        x2 = cx + (r-6) * math.cos(angle)
        y2 = cy + (r-6) * math.sin(angle)
        w = 4 if i % 3 == 0 else 2
        d.line([(x1,y1),(x2,y2)], fill=color_ring, width=w)
    # hour hand — near midnight (11:57 → 11 at ~330°)
    hour_angle = math.radians(330 - 90)
    hx = cx + (r*0.55) * math.cos(hour_angle)
    hy = cy + (r*0.55) * math.sin(hour_angle)
    d.line([(cx,cy),(hx,hy)], fill=color_hand, width=8)
    # minute hand — 57 minutes → nearly straight up
    min_angle = math.radians(342 - 90)
    mx = cx + (r*0.82) * math.cos(min_angle)
    my = cy + (r*0.82) * math.sin(min_angle)
    d.line([(cx,cy),(mx,my)], fill=color_hand, width=5)
    # center dot
    d.ellipse([(cx-8, cy-8),(cx+8, cy+8)], fill=color_ring)

def ad5_feed():
    img, d = new_img(bg=(12, 10, 8))

    # subtle vignette-ish gradient via layered semi-transparent rectangles
    for i in range(12):
        alpha_val = int(30 * (1 - i/12))
        pad = i * 45
        d.rectangle([(pad, pad),(1080-pad, 1080-pad)],
                     outline=(228,195,134), width=1)

    # Clock centred in upper half
    draw_clock(d, cx=540, cy=380, r=240,
               color_face=(20,18,14),
               color_hand=WHITE,
               color_ring=TAN)

    # Urgency text
    cx_text(d, "YOUR SELLER HAS A DEADLINE.", 660, f_cond(72), TAN)
    cx_text(d, "DO YOU HAVE A LENDER?", 742, f_cond(72), WHITE)

    rule_h(d, 820, 120, 960)

    # Process row
    steps = ["DAY 1\nSUBMIT", "DAY 2–3\nTERM SHEET", "DAY 30\nCLOSED"]
    col_w = 960 // 3
    for i, step in enumerate(steps):
        lines = step.split("\n")
        cx_i = 60 + col_w * i + col_w // 2
        d.text((cx_i - d.textbbox((0,0),lines[0],font=f_mono_b(22))[2]//2, 845),
               lines[0], font=f_mono_b(22), fill=TAN)
        d.text((cx_i - d.textbbox((0,0),lines[1],font=f_mono(20))[2]//2, 876),
               lines[1], font=f_mono(20), fill=CREAM)
        if i < 2:
            d.text((60 + col_w*(i+1) - 12, 855), "→", font=f_cond(40), fill=GREY_MID)

    rule_h(d, 930, 120, 960)

    cx_text(d, "NON-RECOURSE BRIDGE & ACQUISITION LOANS · $1M–$25M", 958, f_mono(19), GREY_MID)

    pill_y = 1005
    pill_w, pill_h = 400, 58
    px = (1080-pill_w)//2
    d.rounded_rectangle([(px, pill_y),(px+pill_w, pill_y+pill_h)], radius=6, fill=TAN)
    cx_text(d, "SUBMIT A DEAL →", pill_y+15, f_body_b(27), FOREST_DEEP)

    save(img, "ad5_time_kills_deals_feed.png")

# ── Run all ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating 1Oak Meta Ad images...\n")
    ad1_feed()
    ad2_carousel()
    ad3_feed()
    ad4_feed()
    ad5_feed()
    print("\nDone. All images saved to Advertisements/")
