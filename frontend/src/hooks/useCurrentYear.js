import { useEffect, useState } from "react";

export const useCurrentYear = () => {
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    const intervalId = setInterval(() => {
      const nextYear = new Date().getFullYear();
      setYear((prevYear) => (prevYear === nextYear ? prevYear : nextYear));
    }, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return year;
};
