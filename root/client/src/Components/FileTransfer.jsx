import React, { useState } from 'react';
import DragDropandSend from './DragDropandSend';
import ReceiveFiles from './ReceiveFiles';
import './FileTransfer.css'; // Updated to a new CSS file name

function FileTransfer() {
    const [activeTab, setActiveTab] = useState('send'); // Default tab

    return (
        <div className="app-container">
            <nav className="navbar">
                <div className="navbar-brand">FileTransfer</div>
                <div className="navbar-buttons">
                    <button
                        className={`nav-button ${activeTab === 'send' ? 'active' : ''}`}
                        onClick={() => setActiveTab('send')}
                    >
                        Send
                    </button>
                    <button
                        className={`nav-button ${activeTab === 'receive' ? 'active' : ''}`}
                        onClick={() => setActiveTab('receive')}
                    >
                        Receive
                    </button>
                </div>
            </nav>

            <div className="content">
                {activeTab === 'send' ? <DragDropandSend /> : <ReceiveFiles />}
            </div>
        </div>
    );
}

export default FileTransfer;