import { createGlobalState } from "react-hooks-global-state";
import moment from "moment";

export const { useGlobalState, setGlobalState, getGlobalState } =
  createGlobalState({
    createModal: "scale-0",
    connectedAccount: "",
    contract: null,
    proposals: [],
    isStakeholder: false,
    balance: 0,
    myBalance: 0,
  });

export const truncate = (
  text: string,
  startChars: number,
  endChars: number,
  maxLength: number
) => {
  if (text.length > maxLength) {
    return text.slice(0, startChars) + "..." + text.slice(-endChars);
  } else {
    return text;
  }
};

export const daysRemaining = (date: any) => {
  const todaysDate = moment();
  date = Number((date + "000").slice(0));
  date = moment(date).format("YYYY-MM-DD");
  date = moment(date);
  date = date.diff(todaysDate, "days");
  return (date = 1 ? "1 day" : date + " days");
};
