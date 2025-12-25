import pickle
import numpy as np
import pandas as pd
import os

# Define paths relative to the project root
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
CSV_PATH = os.path.join(MODEL_DIR, "yield_df.csv")
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

area_map = {}
item_map = {}

model = None
scaler = None

def init_model():
    global model, scaler, area_map, item_map
    
    print(f"--- MODEL INITIALIZATION START ---")
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"CSV_PATH: {CSV_PATH}")

    # Load Data to build maps
    try:
        if os.path.exists(CSV_PATH):
            print(f"CSV found. Loading data...")
            df = pd.read_csv(CSV_PATH)
            unique_areas = sorted(df['Area'].unique())
            unique_items = sorted(df['Item'].unique())
            
            area_map = {name: i for i, name in enumerate(unique_areas)}
            item_map = {name: i for i, name in enumerate(unique_items)}
            
            print(f"Initialized {len(area_map)} areas and {len(item_map)} crops.")
        else:
            print(f"FATAL: CSV not found at {CSV_PATH}")
            if os.path.exists(MODEL_DIR):
                print(f"Model dir exists, contents: {os.listdir(MODEL_DIR)}")
    except Exception as e:
        print(f"ERROR during CSV load: {e}")

    # Load Pickle Files
    try:
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, "rb") as f:
                model = pickle.load(f)
            print("Model.pkl loaded.")
        if os.path.exists(SCALER_PATH):
            with open(SCALER_PATH, "rb") as f:
                scaler = pickle.load(f)
            print("Scaler.pkl loaded.")
    except Exception as e:
        print(f"ERROR during pickle load: {e}")
    
    print(f"--- MODEL INITIALIZATION COMPLETE ---")

def get_options():
    # Return lists for frontend dropdowns
    return {
        "areas": list(area_map.keys()),
        "items": list(item_map.keys())
    }

def predict_yield(features):
    # features: dict with keys: area, item, year, rainfall, pesticides, temp
    
    if model is None or scaler is None:
        raise Exception("Model not loaded properly.")
    
    try:
        area_val = area_map.get(features["area"])
        item_val = item_map.get(features["item"])
        
        if area_val is None:
            raise ValueError(f"Invalid Area: {features['area']}")
        if item_val is None:
            raise ValueError(f"Invalid Item: {features['item']}")
            
        # The order depends on training:
        # ['Area', 'Item', 'Year', 'average_rain_fall_mm_per_year', 'pesticides_tonnes', 'avg_temp']
        
        row = np.array([[
            area_val,
            item_val,
            float(features["year"]),
            float(features["rainfall"]),
            float(features["pesticides"]),
            float(features["temp"])
        ]])
        
        # Scale
        scaled_row = scaler.transform(row)
        
        # Predict
        prediction = model.predict(scaled_row)
        return float(prediction[0])
        
    except Exception as e:
        print(f"Prediction error: {e}")
        raise e

# Initialize when module is imported
init_model()
