# Premium Quantum Supply Chain Dashboard

## ✨ Features

- **Glassmorphism UI**: Modern frosted-glass design with backdrop blur
- **Framer Motion Animations**: Smooth page transitions and micro-interactions
- **Dark + Neon Theme**: Futuristic cyberpunk aesthetic with gradient accents
- **Interactive Graph Visualization**: D3-force network with dynamic route highlighting
- **Real-time Cost Comparison**: Animated charts comparing classical vs quantum solutions
- **Resilience Testing**: Simulate route disruptions and re-optimize on the fly
- **Production-Ready SaaS Design**: Premium, polished interface

## 🚀 Run

### Prerequisites

Ensure the backend is running:
```bash
cd ../backend
uvicorn main:app --reload --port 8000
```

### Frontend Setup

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open:

```
http://127.0.0.1:3000
```

## 🎨 Technologies

- **Next.js 14**: React framework
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **D3.js**: Network visualization
- **Recharts**: Animated charts
- **React Icons**: Icon library

## 🌍 Backend API

Frontend calls:
- `POST /optimize/classical`
- `POST /optimize/quantum`
- `POST /simulate`

Default API URL: `http://127.0.0.1:8000`

To override:
```bash
NEXT_PUBLIC_API_URL=http://your-backend:port npm run dev
```

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🎯 Demo Flow

1. **Hero Section**: Animated landing page with CTA buttons
2. **Optimization**: Run classical and quantum solvers simultaneously
3. **Visualization**: See both routes highlighted on the network graph
4. **Comparison**: View cost metrics and efficiency improvements
5. **Disruption Test**: Select routes to disable and re-optimize to test resilience

---

**Made for hackathon victory!** 🏆

