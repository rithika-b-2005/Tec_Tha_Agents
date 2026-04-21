export const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export const transition = {
  duration: 0.5,
  ease: "easeOut" as const,
}
