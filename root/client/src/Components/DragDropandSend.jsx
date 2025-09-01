import React, { useRef, useState } from "react";
import GenerateRandomWords from "../GenerateRandomWords"; // Ensure this file exists
import './DragDropandSend.css';

function DragDropandSend() {
    const inputRef = useRef();
    const [files, setFiles] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [randomCode, setCode] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false); // New loading state

    const handleDrop = (e) => {
        e.preventDefault();
        const droppedFiles = [...e.dataTransfer.files];
        handleFileLogic(droppedFiles);
        setDragging(false);
    };

    const handleBrowse = (e) => {
        const selectedFiles = [...e.target.files];
        handleFileLogic(selectedFiles);
    };

    const handleFileLogic = (newFiles) => {
        if (newFiles.length > 1) {
            setErrorMessage('You can only upload one file at a time.');
            return;
        }
         const file = newFiles[0];
    if (file.size > 500 * 1024 * 1024) { // 400 MB in bytes
        setErrorMessage('File size cannot exceed 500 MB.');
        return;
    }
        setFiles(newFiles.map((file) => ({
            file,
            name: file.name,
            type: file.type,
            size: file.size,
            relativePath: file.webkitRelativePath || null,
        })));
        setErrorMessage('');
        console.log("Selected file:", newFiles[0]);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = () => {
        setDragging(false);
    };

    const handleClick = () => {
        inputRef.current.click();
    };

    const handleSend = async (e) => {
        e.preventDefault();

        if (files.length === 0) {
            setErrorMessage('Please select or drop a file to proceed.');
            return;
        }

        setLoading(true); // Start spinner
        setErrorMessage('');
        const code = GenerateRandomWords();
        
        const formData = new FormData();
        files.forEach(item => formData.append('files', item.file));
        formData.append('code', code);

        try {
            const response = await fetch('https://quickshare-q3sj.onrender.com/upload', {
            // const response = await fetch('http://localhost:5000/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log("Server response:", result);

             // Only set the code after successful upload
            setCode(code);

        } catch (error) {
            console.error("Error sending data to backend:", error);
            if (error.message.includes('Failed to fetch')) {
                setErrorMessage('Network error: Cannot reach the server.check file Type');

            } else {
                setErrorMessage('An unexpected error occurred. Please try again.');
            }
        }

        setLoading(false); // Stop spinner
        // setCode(code);
    };

    const handleDeleteFile = () => {
        setFiles([]);
    };

    return (
        <div className="container">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`drop-zone ${dragging ? 'dragging' : ''}`}
            >
                <div className="upload-icon">
                    <i className="fa fa-cloud-upload fa-3x animate_animated animate_bounce" style={{ color: "#007bff" }}></i>
                    <h3 style={{ color: "black" }} className="box-drop">Drop your file here</h3>
                </div>
                <p><span onClick={handleClick} className="choose-option">click to choose file</span></p>
                <input
                    type="file"
                    ref={inputRef}
                    onChange={handleBrowse}
                    style={{ display: "none" }}
                />
            </div>

            {errorMessage && <div style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</div>}

            {files.length > 0 && (
                <div className="file-container">
                    <h4>Selected file:</h4>
                    {files.map((f, i) => (
                        <div key={i} className="file-item">
                            <div className="file-info">
                                <span>{f.relativePath || f.name} — <i>{f.type || "Unknown"}</i></span>
                                <button
                                    onClick={handleDeleteFile}
                                    className="delete-button"
                                >
                                    remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div>
                <form >
                    <button className="sendbutton" onClick={handleSend}>
                        {loading ? (<><span className="spinner-border spinner-border-sm me-2"></span> <span>Sending...</span> <div>do not exit this page</div> </>) : "Send"}
                    </button>
                </form>
            </div>

            {randomCode && <div className="code" style={{ color: 'black' }}>Enter This Code To Recieve : "{randomCode}" </div>}
        </div>
    );
}

export default DragDropandSend;
