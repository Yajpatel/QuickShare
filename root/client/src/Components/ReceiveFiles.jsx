import React, { useState } from "react";
import axios from "axios";
import './ReceiveFiles.css';

function ReceiveFiles() {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [files, setFiles] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!code.trim()) {
            setMessage("Please enter a valid code.");
            return;
        }

        setDownloading(true);
        setMessage('');
        setFiles([]);

        try {
            // Use axios to check if files exist for the code
            // https://quickshare-q3sj.onrender.com/upload
            // const response = await axios.get(`https://quickshare-q3sj.onrender.com/files/${code}`);
            const response = await axios.get(`http://localhost:5000/files/${code}`);
            if (response.data.files && response.data.files.length > 0) {
                setMessage(`Downloading ${response.data.files.length} file(s)...`);
                // Trigger download from backend (first file)
                const link = document.createElement('a');
                // link.href = `https://quickshare-q3sj.onrender.com/download/${code}`;
                link.href = `http://localhost:5000/download/${code}`;
                link.setAttribute('download', '');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                setMessage("No files found for this code.");
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                setMessage("Invalid or expired code. Please check and try again.");
            } else {
                setMessage("An error occurred while fetching files. Please try again.");
            }
        }
        setDownloading(false);
    };

    // Function to download file
    const downloadFile = (url, fileName) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="container">
            <h3 style={{ color: "black" }} className="label">
                <div><i className="fa-regular fa-circle-down bouncing-icon"></i> </div>
                <span>Receive File</span>
            </h3>
            <form onSubmit={handleSubmit}>
                <div className="for-center">
                    <div>
                        <input
                            type="text"
                            placeholder="Enter code here"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="input-box"
                        />
                    </div>
                    <div>
                        <button className="sendbutton" type="submit" disabled={downloading}>
                            {downloading ? (<><span className="spinner-border spinner-border-sm me-2"></span> <span>Checking Code</span> </>) : "Receive"}
                        </button>
                    </div>
                </div>
            </form>

            {message && <p style={{ color: "black", marginTop: "10px" }}>{message}</p>}
        </div>
    );
}

export default ReceiveFiles;