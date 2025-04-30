import React from 'react';
import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-icons">
                <a href="https://github.com/YajPatel" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-github"></i>
                </a>
                <a href="https://www.linkedin.com/in/yaj-patel-956557330" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-linkedin"></i>
                </a>
                <a href="https://www.instagram.com/Yaj_patel_3594" target="_blank" rel="noopener noreferrer">
                    <i className="fab fa-instagram"></i>
                </a>
                <a href="mailto:yajpatel3594@gmail.com">
                    <i className="fas fa-envelope"></i>
                </a>
            </div>
            <div className="footer-text">QuickShare 2025</div>
        </footer>
    );
}

export default Footer;
