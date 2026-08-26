import { useLottie } from "lottie-react";

const LottieAnimation = ({src, height}: {src: string; height: number}) => {
  const lottie = useLottie({ src, autoplay: true, loop: true });
  return <div ref={lottie.setDisplayRef} style={{ height }} />;
};

export default LottieAnimation;