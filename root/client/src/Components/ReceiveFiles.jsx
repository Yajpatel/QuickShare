import React, { useState } from "react";
import './ReceiveFiles.css';

function ReceiveFiles() {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [downloading, setDownloading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!code.trim()) {
            setMessage("Please enter a valid code.");
            return;
        }

        setDownloading(true);
        setMessage('');

        try {
            const nameRes = await fetch(`http://localhost:5000/download/filename/${code}`);
            console.log(nameRes);
            if (!nameRes.ok) {
                setMessage("Unable to fetch filename.");
                setDownloading(false);
                return;
            }
            const filename = await nameRes.json(); // e.g., { filename: "myfile.pdf" }

            console.log("hello this is name from backend")
            console.log(filename.filenames);
            
            // console.log(filename);
            // Step 2: Fetch file blob
            const fileRes = await fetch(`http://localhost:5000/download/${code}`);
            if (!fileRes.ok) {
                setMessage("Unable to download file.");
                setDownloading(false);
                return;
            }
            const blob = await fileRes.blob();
    
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename.filenames;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

                    setMessage("check in your downloads!");
        } catch (err) {
            setMessage("Error connecting to server.");
            console.error(err);
        }
        setDownloading(false);
    };
    
    return (
        <div className="container">
            <h3 style={{ color: "black" }}>📥 Receive Files</h3>
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
                            {downloading ? (<><span className="spinner-border spinner-border-sm me-2"></span> <span>Downloading</span> </>) : "Recieve"}
                        </button>
                    </div>
                </div>
                
            </form>

            {message && <p style={{ color: "black", marginTop: "10px" }}>{message}</p>}
        </div>
    );
}

export default ReceiveFiles;