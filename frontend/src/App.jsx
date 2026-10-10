import axios from "axios";
import { useState } from "react";
import * as XLSX from "xlsx";
import "./App.css";

function App() {
  const [msg, setmsg] = useState("");
  const [status, setstatus] = useState(false);
  const [emailList, setEmailList] = useState([]);

  function handlemsg(evt) {
    setmsg(evt.target.value);
  }

  function handlefile(event) {
    const file = event.target.files[0];
    console.log(file);

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = e.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const extractedList = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });
      const totalemail = extractedList.map(function (item) { return item.A; });
      console.log(totalemail);
      setEmailList(totalemail);
    };

    reader.readAsBinaryString(file);
  }

  function send() {
    setstatus(true);
    axios.post("https://bulkmail-backend.vercel.app/sendemail", { msg: msg, emailList: emailList })
      .then(function (data) {
        if (data.data === true) {
          alert("Email Sent Successfully");
          setstatus(false);
        } else {
          alert("Failed");
          setstatus(false);
        }
      })
      .catch((err) => {
        console.error(err);
        alert("An error occurred while sending emails.");
        setstatus(false);
      });
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>BulkMail</h1>
        <p>We can help your business with sending multiple emails at once</p>
      </div>

      <div className="form-content">
        <label className="textarea-label">Compose Email Message</label>
        <textarea 
          onChange={handlemsg} 
          value={msg} 
          className="email-textarea" 
          placeholder="Enter the email text here..."
        ></textarea>

        <div className="file-upload-container">
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#334155' }}>
            Upload Excel File (Drag & Drop or Choose)
          </label>
          <input type="file" onChange={handlefile} className="file-input" />
        </div>

        <p className="email-count">Total Emails in the file: {emailList.length}</p>

        <button 
          onClick={send} 
          disabled={status} 
          className="send-button"
        >
          {status ? "Sending..." : "Send Emails"}
        </button>
      </div>
    </div>
  );
}

export default App;