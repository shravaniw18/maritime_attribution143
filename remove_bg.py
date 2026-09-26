import os
from rembg import remove
from PIL import Image

def process_image(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)
        print(f"Saved to {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    base_dir = r"c:\Users\god07\Downloads\personal drive copies\hackthon\sih\shravani proto\maritime_attribution143\backend\app\static\img"
    
    # Process full logo
    full_logo_input = os.path.join(base_dir, "lehar-logo-full.png")
    full_logo_output = os.path.join(base_dir, "lehar-logo-full-transparent.png")
    if os.path.exists(full_logo_input):
        process_image(full_logo_input, full_logo_output)
        
    # Process compact logo (icon)
    icon_logo_input = os.path.join(base_dir, "lehar-icon.png")
    icon_logo_output = os.path.join(base_dir, "lehar-icon-transparent.png")
    if os.path.exists(icon_logo_input):
        process_image(icon_logo_input, icon_logo_output)

    # Let's also check if it's logo.png
    logo_input = os.path.join(base_dir, "logo.png")
    if os.path.exists(logo_input) and not os.path.exists(icon_logo_input):
        process_image(logo_input, icon_logo_output)

    print("Done")
