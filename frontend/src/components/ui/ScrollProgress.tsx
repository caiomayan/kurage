"use client";

import React from "react";
import { motion, useScroll } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 bottom-0 right-0 w-[2px] bg-ink z-[100] origin-top"
      style={{ scaleY: scrollYProgress }}
    />
  );
}
