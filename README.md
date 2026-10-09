\# AquaIntel — AI-Based Water Pump Monitoring and Predictive Maintenance



AquaIntel is a web-based monitoring system designed to help users track water pump health, monitor alerts, visualize performance data, and view predictive maintenance recommendations.



\## Features



\* \*\*Pump Monitoring:\*\* View pump details and health scores.

\* \*\*Dashboard Analytics:\*\* Visualize pump performance and monitoring data.

\* \*\*Health Prediction:\*\* View health status, failure-risk estimates, and maintenance recommendations.

\* \*\*Alert Management:\*\* Review alerts and acknowledge or resolve them.

\* \*\*REST API:\*\* Access backend functionality through FastAPI endpoints.

\* \*\*Interactive Dashboard:\*\* React-based user interface with charts and pump details.



\## Technology Stack



\*\*Frontend\*\*



\* React

\* TypeScript

\* Vite

\* Axios

\* Data visualization and charts



\*\*Backend\*\*



\* Python

\* FastAPI

\* REST APIs



\*\*Machine Learning\*\*



\* Predictive health and maintenance analysis, according to the implemented backend model



\## Project Structure



```text

AquaIntel\_New/

├── backend/

│   ├── main.py

│   └── .env.example

├── frontend/

│   ├── src/

│   ├── package.json

│   └── index.html

├── .gitignore

└── README.md

```



\*Note: The structure above is illustrative. Update it if your actual files differ.\*



\## Prerequisites



\* Python installed

\* Node.js and npm installed

\* Git (for version control)



\## Run the Project Locally



\### 1. Start the Backend



Open a terminal in the project root:



```bash

cd backend

```



Activate the project's existing virtual environment:



\*\*Windows Command Prompt:\*\*



```bat

..\\.venv\\Scripts\\activate

```



Install the backend dependencies using the dependency file included in your project. If your project has `requirements.txt`, run:



```bash

python -m pip install -r requirements.txt

```



Start FastAPI:



```bash

python -m uvicorn main:app --reload

```



Backend URL: http://127.0.0.1:8000



API documentation: http://127.0.0.1:8000/docs



\### 2. Start the Frontend



Open a second terminal:



```bash

cd frontend

npm install

npm run dev

```



Open the local URL printed by Vite, usually http://localhost:5173/.



\## Important Notes



\* Create configuration from `.env.example` only after checking the variables required by the backend.

\* Never commit `.env` files containing secrets or credentials.

\* Predictions and failure-risk estimates should be treated as experimental outputs, not guaranteed equipment-failure predictions.

\* Use representative test data when demonstrating the application.



\## Future Improvements



\* Automated sensor-data ingestion

\* More extensive model evaluation

\* Role-based access control

\* Deployment with secure environment configuration

\* Automated backend and frontend tests



\## Author



Chandana



\## Disclaimer



AquaIntel is an educational software project for monitoring and predictive-maintenance demonstrations. It is not a substitute for professional equipment inspections or safety procedures.



