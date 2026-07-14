markdown_content = """# TennisFolio Color Palette

The color palette of Roland-Garros (The French Open) is one of the most iconic and recognizable in all of sports. It is defined by the beautiful, warm clay courts, contrasting with deep forest greens and the stark white of the baseline.

## 🎨 Color Specifications

| Preview | Color Name | Hex Code | RGB | Description |
| :---: | :--- | :--- | :--- | :--- |
| <img src="https://via.placeholder.com/20/C23B22/000000?text=+" width="20" height="20" style="border-radius:4px;"/> | **Clay Terracotta** | `#C23B22` | `rgb(194, 59, 34)` | The iconic, rich red-orange dust of the legendary Parisian courts. |
| <img src="https://via.placeholder.com/20/004B23/000000?text=+" width="20" height="20" style="border-radius:4px;"/> | **Classic Court Green** | `#004B23` | `rgb(0, 75, 35)` | The deep, traditional green found on the stadium windscreens, branding, and tournament banners. |
| <img src="https://via.placeholder.com/20/F1F3F4/000000?text=+" width="20" height="20" style="border-radius:4px; border:1px solid #ddd;"/> | **Crisp Baseline White** | `#F1F3F4` | `rgb(241, 243, 244)` | The bright, high-contrast white used for court lines, giving structure and separation. |
| <img src="https://via.placeholder.com/20/E3783B/000000?text=+" width="20" height="20" style="border-radius:4px;"/> | **Suntan Ochre** | `#E3783B` | `rgb(227, 120, 59)` | A lighter, sun-bleached variant of the clay, reflecting the bright afternoon Parisian sun. |
| <img src="https://via.placeholder.com/20/1C2D37/000000?text=+" width="20" height="20" style="border-radius:4px;"/> | **Dark Slate/Navy** | `#1C2D37` | `rgb(28, 45, 55)` | Used in modern digital branding, typography, and premium seating accents for added depth. |

---

## 💡 Design & Application Notes

* **Primary Contrast:** When designing, use the **Clay Terracotta** (`#C23B22`) and the **Classic Court Green** (`#004B23`) as your dominant contrasting elements. They represent the literal earth and structure of the venue.
* **The "Baseline" Rule:** Use the **Crisp Baseline White** (`#F1F3F4`) generously as a background or negative space separator. It prevents the intense clay red from overwhelming the composition and mimics how lines visually define the actual court.
* **Modern Accents:** Use **Dark Slate/Navy** (`#1C2D37`) for text, high-contrast UI borders, or primary buttons to keep the layout feeling professional, modern, and accessible.
"""

file_path = "roland_garros_palette.md"
with open(file_path, "w", encoding="utf-8") as f:
    f.write(markdown_content)

print(f"File successfully created: {file_path}")