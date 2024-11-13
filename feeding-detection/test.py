import ssl
import cv2
import tensorflow as tf
import numpy as np
import time
import websocket

# 1, 2, 3, 4, 8, 9

model_path = "model.tflite"  # Replace with the path TFLite model file
label_path = 'labels.txt'  # Replace with the path labels.txt file
video_path = "animal3.mp4"  # Replace with the path video file

websocket_url = "wss://weatherlkbackend.onrender.com"

def init_websocket(url):
    ws = websocket.WebSocket(sslopt={"cert_reqs": ssl.CERT_NONE})
    ws.connect(url)
    return ws

def load_labels(label_path):
    with open(label_path, 'r') as f:
        return {i: line.strip() for i, line in enumerate(f.readlines())}

def classify_image(interpreter, image):
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    input_shape = input_details[0]['shape']
    input_data = cv2.resize(image, (input_shape[1], input_shape[2]))
    input_data = np.expand_dims(input_data, axis=0).astype(np.float32) / 255.0

    interpreter.set_tensor(input_details[0]['index'], input_data)
    interpreter.invoke()

    output_data = interpreter.get_tensor(output_details[0]['index'])[0]
    max_index = np.argmax(output_data)
    max_score = output_data[max_index]
    return max_index, max_score

def main():
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    labels = load_labels(label_path)

    cap = cv2.VideoCapture(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS)
    delay = int(1000 / fps)

    ws = init_websocket(websocket_url)

    last_sent_time = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)

        label_id, score = classify_image(interpreter, frame)

        if score > 0.95:
            label = labels[label_id]

            cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 5)

        # boundary box
            if label == '0 feeding':
                cv2.rectangle(frame, (50, 50), (frame.shape[1] - 50, frame.shape[0] - 50), (0, 0, 255), 5)
            elif label == '1 petting':
                cv2.rectangle(frame, (50, 50), (frame.shape[1] - 50, frame.shape[0] - 50), (0, 255, 0), 5)
            elif label == '2 none':
                pass

            current_time = time.time()
            if current_time - last_sent_time > 5:
                # Send message via WebSocket
                if label in ['0 feeding', '1 petting']:
                    message = f"Visitor is Feeding!"
                    ws.send(message)
                    print(f"Sent message: {message}")

                    # Update last sent time
                    last_sent_time = current_time

        cv2.imshow('frame', frame)

        print(f"Label: {labels[label_id]}, Score: {score}")

        if cv2.waitKey(delay) & 0xFF == ord('q'):
            break

    cap.release()
    ws.close()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
