/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                github: {
                    dark: '#0d1117',
                    darker: '#010409',
                    border: '#30363d',
                    hover: '#161b22',
                    blue: '#58a6ff',
                    green: '#3fb950',
                    red: '#f85149',
                    orange: '#d29922',
                    purple: '#bc8cff',
                }
            },
            fontFamily: {
                'display': ['Space Mono', 'monospace'],
                'body': ['JetBrains Mono', 'Monaco', 'Courier New', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in',
                'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-down': 'slideDown 0.4s ease-out',
                'glow': 'glow 2s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                glow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(88, 166, 255, 0.5)' },
                    '50%': { boxShadow: '0 0 20px rgba(88, 166, 255, 0.8)' },
                },
            },
        },
    },
    plugins: [],
}
