# Project Setup

Follow these steps to set up and run the project:

## 1. Create the Virtual Environment
```sh
python3 -m venv venv
```

## 2. Activate the Virtual Environment

### For Linux/Mac:
```sh
source ./venv/bin/activate
```

### For Windows:
```sh
. venv/bin/
```

## 3. Install Dependencies

```sh
pip install -r requirements.txt
```

## 4. Run the Server

Choose one of the following methods:

### Option A:
```sh
fastapi dev main.py
```

### Option B:
```sh
uvicorn -m main:app --reload
```

Now your project is set up and ready to run!
