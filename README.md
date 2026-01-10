node.js- version 16.0 or above
npm : v8.x or above (comes with Node.js)
React.js : v18+
MongoDB Compass 1.48.2
HTML5, CSS3, JavaScript (ES6+)
after this install follow these steps:

1.Locate to your NLP based text summarization file.
2. Open the terminal there only and enter code . like this only it will open the visual studio
   without you open manual from visual studio. In that Terminal new terminal for next follow 
   the bellow steps:     
 Backend requirements and how to execute[1st run this]:
  1. cd backend and then type this following instructions:
  2. install express using npm install express.
  3. npm audit fix enter like this in terminal.
  4. npm install mongoose cors multer pdf-parse mammoth enter like this for all requirements.
  5. npm install dot env.
  6. go to the website of hugging face API platform and the create your account and go to settings in left side toolbar and in that left         
     side toolbar there is an option called access tokens click on that and follow this step:
            a. create new token
            b. token type: write
            c. token name: anything you can give.
            d. click on create token
            e. you can see token URL that is your API key copy that and paste it in .env file in backend.

  7. run the backend server with the command: node server.js

 Frontend requirements and how to execute[2nd run this] in separate terminal:
   
  1. cd frontend
  2. cd ratishkk
  3. enter in the terminal npm install it will install requirements of the vite or frontend.
  4. npm install lucide-react.
  5. run the frontend server with the command: npm run dev
   
