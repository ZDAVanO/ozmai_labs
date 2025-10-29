import streamlit as st
from PIL import Image
import os

import time

import diff_images_cpp
import io


st.set_page_config(
    page_title="Lab1 - Image Diff",
    page_icon= "⬇️",
    layout="wide" # wide, centered
)


st.markdown("""
    <style>
    [data-testid=stSidebarUserContent] [data-testid=stExpanderDetails]:nth-of-type(1) [data-testid=stVerticalBlock]{
        gap: 0.15rem;
    }
    [data-testid=stExpanderDetails]:nth-of-type(1) [data-testid=stVerticalBlock]{
        gap: 0.5rem;
    }
    [data-testid=stExpanderDetails]:nth-of-type(1){
        padding: 0.75rem;
    }
    [data-testid=stMainBlockContainer]:nth-of-type(1){
        padding-left: 1rem;
        padding-right: 1rem;
    }



    </style>
    """,
    unsafe_allow_html=True
)



types = ["png", "jpg", "jpeg"]

max_dist = ((255 - 0) ** 2 + (255 - 0) ** 2 + (255 - 0) ** 2) ** 0.5



def pil_to_bytes(img):
    # Convert PIL image to raw RGB bytes (contiguous, 3 channels)
    img = img.convert("RGB")
    w, h = img.size
    return img.tobytes(), w, h

def bytes_to_pil(rgb_bytes, w, h):
    # start_time = time.time()
    img = Image.frombytes("RGB", (w, h), rgb_bytes)
    # st.write(f"bytes_to_pil took {time.time() - start_time:.2f} seconds")
    return img



def show_diff_result(rgb1_bytes, rgb2_bytes, w1, h1, threshold):

    # with st.spinner("Computing differences...", show_time=True):
    diff_images_start_time = time.time()
    result_bytes = diff_images_cpp.diff_images_bytes(rgb1_bytes, rgb2_bytes, w1, h1, float(threshold))
    diff_images_est_time = time.time() - diff_images_start_time

    result_img_2 = bytes_to_pil(result_bytes, w1, h1)

    st.image(result_img_2, caption=f"Result ({w1}x{h1})", width="stretch")

    st.write(f"diff_images took {diff_images_est_time:.3f} seconds")


    # # --- Аналіз пікселів у result_bytes ---
    # red = (255, 0, 0)
    # blue = (0, 0, 255)

    # red_count = 0
    # blue_count = 0
    # other_count = 0

    # for i in range(0, len(result_bytes), 3):
    #     pixel = tuple(result_bytes[i:i+3])
    #     if pixel == red:
    #         red_count += 1
    #     elif pixel == blue:
    #         blue_count += 1
    #     else:
    #         other_count += 1

    # st.write(f"Red pixels: {red_count}")
    # st.write(f"Blue pixels: {blue_count}")
    # st.write(f"Other pixels: {other_count}")


    # --- Додаємо кнопку скачати результат ---
    buf = io.BytesIO()
    result_img_2.save(buf, format="PNG")
    buf.seek(0)
    st.download_button(
        label="⬇️ Download",
        data=buf,
        file_name="diff_result.png",
        mime="image/png"
    )



# def diff_images(rgb1, rgb2, w1, h1, threshold: float):
#     result_rgb = []
#     append_row = result_rgb.append
#     for y in range(h1):
#         row = []
#         append_pixel = row.append
#         rgb1_row = rgb1[y]
#         rgb2_row = rgb2[y]
#         for x in range(w1):
#             r1, g1, b1 = rgb1_row[x]
#             r2, g2, b2 = rgb2_row[x]
#             dr = r1 - r2
#             dg = g1 - g2
#             db = b1 - b2
#             dist = (dr * dr + dg * dg + db * db) ** 0.5
#             if dist > threshold:
#                 mean1 = (r1 + g1 + b1) / 3
#                 mean2 = (r2 + g2 + b2) / 3
#                 if mean1 > mean2:
#                     append_pixel((255, 0, 0))
#                 else:
#                     append_pixel((0, 0, 255))
#             else:
#                 append_pixel((r1, g1, b1))
#         append_row(row)
#     return result_rgb, w1, h1




with st.sidebar:
    threshold_type = st.radio("Threshold type", ["Intensity", "Percent"], horizontal=True)
    
    if threshold_type == "Percent":
        percent = st.slider("Threshold (%)", min_value=0.0, max_value=100.0, value=50.0, step=0.1)
        threshold = percent * max_dist / 100.0
    else:
        threshold = st.slider("Threshold (intensity)", min_value=0.0, max_value=max_dist, value=max_dist/2)
    
    st.write(f"Computed intensity threshold: {threshold:.2f}")

    st.divider()

    result_mode = st.radio("View mode", ["Row", "Large Result"], horizontal=False)





img_upl_col1, img_upl_col2, img_upl_col3 = st.columns(3)

with img_upl_col1:
    img1_file = img_upl_col1.file_uploader("Upload first image", type=types, key="img1")
    if img1_file:
        img1 = Image.open(img1_file)

        rgb1_time = time.time()
        rgb1_bytes, w1, h1 = pil_to_bytes(img1)
        st.write(f"Loading image 1 took {time.time() - rgb1_time:.2f} seconds")


with img_upl_col2:
    img2_file = img_upl_col2.file_uploader("Upload second image", type=types, key="img2")
    if img2_file:
        img2 = Image.open(img2_file)

        rgb2_time = time.time()
        rgb2_bytes, w2, h2 = pil_to_bytes(img2)
        st.write(f"Loading image 2 took {time.time() - rgb2_time:.2f} seconds")

# with img_upl_col3:





img_col1, img_col2, img_col3 = st.columns(3)

with img_col1:
    if img1_file:
        st.image(img1_file, caption=f"Image 1 ({w1}x{h1})", width="stretch")
        pass

with img_col2:
    if img1_file and img2_file:
        if (w2, h2) != (w1, h1):

            start_time = time.time()
            rgb2_bytes = diff_images_cpp.resize_nn_bytes(rgb2_bytes, w2, h2, w1, h1)
            est_time = time.time() - start_time

            resized_img2 = bytes_to_pil(rgb2_bytes, w1, h1)

            st.image(resized_img2, caption=f"Image 2 (Resized to {w1}x{h1})", width="stretch")

            st.write(f"Resizing took {est_time:.2f} seconds")

        st.image(img2_file, caption=f"Image 2 ({w2}x{h2})", width="stretch")
    elif img2_file:
        st.image(img2_file, caption=f"Image 2 ({w2}x{h2})", width="stretch")

with img_col3:
    if result_mode == "Row":
        if img1_file and img2_file:
            show_diff_result(rgb1_bytes, rgb2_bytes, w1, h1, threshold)

if result_mode == "Large Result":
    if img1_file and img2_file:
        show_diff_result(rgb1_bytes, rgb2_bytes, w1, h1, threshold)