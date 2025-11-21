'use client';

import { Github, Mail, Code, Heart } from 'lucide-react';
import styles from '../styles/Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.logo}>
            <Code size={20} />
            <span className={styles.logoText}>Retro Game Hub</span>
          </div>
          <p className={styles.tagline}>
            Built with <Heart size={14} className={styles.heart} /> for retro gaming enthusiasts
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Developer</h3>
          <p className={styles.developerName}>Game Hub Team</p>
          <div className={styles.links}>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
              aria-label="GitHub"
            >
              <Github size={18} />
              <span>GitHub</span>
            </a>
            <a 
              href="mailto:contact@gamehub.com"
              className={styles.link}
              aria-label="Email"
            >
              <Mail size={18} />
              <span>Contact</span>
            </a>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Tech Stack</h3>
          <ul className={styles.techList}>
            <li>Next.js 16</li>
            <li>React 19</li>
            <li>TypeScript</li>
            <li>Firebase</li>
          </ul>
        </div>
      </div>
      
      <div className={styles.bottom}>
        <p className={styles.copyright}>
          © {currentYear} Retro Game Hub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
