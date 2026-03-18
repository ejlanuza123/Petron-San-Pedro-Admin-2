// src/components/RouteForce.jsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteForce({ children }) {
  // Disabled the aggressive unmount/remount behavior when tab loses focus.
  // We simply pass children through to let React handle rendering naturally.
  return <>{children}</>;
}