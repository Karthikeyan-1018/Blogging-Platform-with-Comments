import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTwitter, FaGithub, FaLinkedinIn, FaInstagram, FaPenNib } from 'react-icons/fa';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand & Description Column */}
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-icon" style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}>
                <FaPenNib size={12} />
              </span>
              <span className="gradient-text">BlogHub</span>
            </div>
            <p className="footer-text">
              A premium, decentralized space for creators to write stories, share knowledge, and engage with their readers in a constructive way.
            </p>
            <div className="footer-socials">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaTwitter />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaGithub />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaLinkedinIn />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaInstagram />
              </a>
            </div>
          </div>

          {/* Platform Links Column */}
          <div>
            <h4 className="footer-links-title">Platform</h4>
            <ul className="footer-links-list">
              <li><NavLink to="/" className="footer-link">Home</NavLink></li>
              <li><NavLink to="/login" className="footer-link">Sign In</NavLink></li>
              <li><NavLink to="/register" className="footer-link">Sign Up</NavLink></li>
            </ul>
          </div>

          {/* Legal Information Column */}
          <div>
            <h4 className="footer-links-title">Legal</h4>
            <ul className="footer-links-list">
              <li><a href="#privacy" className="footer-link">Privacy Policy</a></li>
              <li><a href="#terms" className="footer-link">Terms of Service</a></li>
              <li><a href="#cookies" className="footer-link">Cookie Settings</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} BlogHub Inc. All rights reserved.</p>
          <p>Created under modern web design standards.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
