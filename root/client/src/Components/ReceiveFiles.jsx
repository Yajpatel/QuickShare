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
                const response = await fetch(`https://quickshare-q3sj.onrender.com/download/${code}`);

                if (!response.ok) {
                    setMessage("Download failed. Invalid or expired code.");
                    setDownloading(false);
                    return;
                }

                const blob = await response.blob();
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'downloaded_file';

                if (contentDisposition && contentDisposition.includes('filename=')) {
                    filename = contentDisposition
                        .split('filename=')[1]
                        .split(';')[0]
                        .replace(/"/g, '');
                }

                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);

                setMessage("File downloaded successfully!");
            } catch (error) {
                console.error("Error during download:", error);
                setMessage("An error occurred while downloading.");
            }
            setDownloading(false);
        };
        
        return (
            <div className="container">
                <h3 style={{ color: "black" }} className="label">
                    <i className="fa-regular fa-circle-down bouncing-icon"></i> Receive File
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