import streamlit as st
import cv2
import tempfile
import requests
import time
import numpy as np
from ultralytics import YOLO

# streamlit run st_1.py

# Load YOLO model
model = YOLO("Models/tshirt_det_20.pt")
last_request_time = 0


def check_color(box_coordinates, frame, threshold):
    global last_request_time
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    color_bbox = []

    # Define white color range
    lower_white = np.array([140, 140, 140], dtype=np.uint8)
    upper_white = np.array([255, 255, 255], dtype=np.uint8)

    for box in box_coordinates:
        x_min, y_min, x_max, y_max = map(int, box[0])
        roi = image[y_min:y_max, x_min:x_max]
        white_mask = cv2.inRange(roi, lower_white, upper_white)
        white_pixels = cv2.countNonZero(white_mask)
        total_pixels = roi.shape[0] * roi.shape[1]
        white_percentage = (white_pixels / total_pixels) * 100

        if white_percentage < threshold: 
            color_bbox.append(box)
            current_time = time.time()
            if current_time - last_request_time >= 5:
                data = {"message": "Intruder Alert!"}
                try:
                    response = requests.post("https://weatherlkbackend.onrender.com/message", json=data)
                    if response.status_code == 200:
                        st.sidebar.write("🔔 Alert sent successfully!")
                    else:
                        st.sidebar.write("⚠️ Failed to send alert.")
                except requests.exceptions.RequestException as e:
                    st.sidebar.write(f"⚠️ Request error: {e}")

                # Update the last request time
                last_request_time = current_time
    return color_bbox

def runmodel(frame, threshold):
    results = model(frame, conf=0.6)
    frame_boxes = []
    for result in results:
        result = results[0].boxes.data
        for result in results:
            for box in result.boxes:
                frame_boxes.append(box.xyxy.tolist())  
    frame_x = check_color(frame_boxes, frame, threshold)
    return frame_x

def process_frame(frame, threshold):
    frame_boxes = runmodel(frame, threshold)
    return frame_boxes

def play_video(source=0, target_size=(640, 480), skip_frames=5, threshold=30):
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        st.error("Error: Cannot open video source.")
        return

    frame_count = 0
    placeholder = st.empty()
    end_video = st.button("End Video")

    alert_triggered = False
    alert_placeholder = st.sidebar.empty()
    bbox_count_placeholder = st.sidebar.empty()

    def update_alert_indicator(status):
        if status:
            alert_placeholder.error("⚠️ Alert: Public Community Alert!")
        else:
            alert_placeholder.success("✅ No Alert")

    update_alert_indicator(alert_triggered)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            st.write("Reached end of video or cannot fetch frame.")
            break

        frame_resized = cv2.resize(frame, target_size)
        frame_boxes = process_frame(frame_resized, threshold)

        new_alert_triggered = any(frame_boxes)
        if new_alert_triggered != alert_triggered:
            alert_triggered = new_alert_triggered
            update_alert_indicator(alert_triggered)

        bbox_count = len(frame_boxes)
        bbox_count_placeholder.info(f"Unauthorized person count: {bbox_count}")

        for box in frame_boxes:
            x_min, y_min, x_max, y_max = map(int, box[0])
            cv2.rectangle(frame_resized, (x_min, y_min), (x_max, y_max), (255, 0, 0), 2)

        frame_rgb = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2RGB)
        placeholder.image(frame_rgb, channels="RGB")

        if end_video:
            st.write("Video display ended.")
            break

        frame_count += 1
        if frame_count % skip_frames == 0:
            time.sleep(0.03)

    cap.release()

st.title("Unauthorized Person Detection and Alerting System")
st.write("Choose a video source or processed frames.")

threshold = st.slider("Set White Percentage Threshold", 0, 100, 30)

use_webcam = st.button("Use Webcam")
uploaded_video = st.file_uploader("Upload a video file", type=["mp4", "avi", "mov"])

if use_webcam:
    st.write("Using webcam for video feed...")
    play_video(source=0, threshold=threshold)

elif uploaded_video is not None:
    tfile = tempfile.NamedTemporaryFile(delete=False)
    tfile.write(uploaded_video.read())

    st.write("Playing uploaded video...")
    play_video(source=tfile.name, threshold=threshold)

else:
    st.write("Select either webcam or upload a video file to proceed.")
