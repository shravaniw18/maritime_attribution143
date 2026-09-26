import numpy as np
from PIL import Image

def process_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    
    # Analyze the colors to find the background
    # The logo is turquoise/cyan. 
    # Checkerboards are usually gray (R=G=B).
    
    # Calculate difference between color channels
    # For gray pixels, R, G, B are very close to each other.
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
    
    # calculate color variance (max - min)
    color_diff = np.max(arr[:,:,:3], axis=2) - np.min(arr[:,:,:3], axis=2)
    
    # For the turquoise logo, green and blue are high, red is low.
    # So color diff is high.
    # Let's say if color diff < 20, it's gray background.
    is_gray = color_diff < 30
    
    # We set alpha to 0 where it's gray
    arr[is_gray, 3] = 0
    
    # Now we need to crop to the bounding box of non-transparent pixels
    non_transparent = np.where(arr[:,:,3] > 0)
    if len(non_transparent[0]) > 0:
        y_min, y_max = np.min(non_transparent[0]), np.max(non_transparent[0])
        x_min, x_max = np.min(non_transparent[1]), np.max(non_transparent[1])
        
        arr_cropped = arr[y_min:y_max+1, x_min:x_max+1]
        out_img = Image.fromarray(arr_cropped)
        out_img.save(output_path)
        print("Cropped size:", out_img.size)
    else:
        print("Image became completely empty!")

process_logo(r"C:\Users\god07\.gemini\antigravity-ide\brain\6520facc-72eb-487f-9f8b-948b7b2f7597\.user_uploaded\media_1790441674382.png", "backend/app/static/img/lehar-icon-transparent.png")
