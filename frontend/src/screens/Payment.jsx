import React, { Fragment, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { setError } from '../redux/slices/appSlice';
import { newBookingAction } from '../redux/actions/hotelAction';
import {
  CardNumberElement,
  CardCvcElement,
  CardExpiryElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";
import { setHasBooked } from '../redux/slices/hotelSlice';
import Meta from '../utils/Meta';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const Payment = () => {
  const payBtn = useRef();
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const bookingDetails = JSON.parse(sessionStorage.getItem('bookingDetails'));
  const hasBooked = useSelector((state) => state.hotelState.hasBooked);

  const paypalClientId = "Afs_f5Gaq6YccxWoRoGg98P5ig31BsJAzHJR5bdj-IfUjRXXuQpRtirZQkWx5KZoCihrk3un4Ff89NCo"; // Thay thế bằng client ID PayPal thực tế của bạn

  useEffect(() => {
    if (hasBooked) {
      navigate('/booking/success');
      dispatch(setHasBooked(false));
    }
  }, [hasBooked, dispatch, navigate]);

  useEffect(() => {
    if (bookingDetails === null) {
      navigate('/ewe');
    }
  }, [bookingDetails, navigate]);

  const submitHandler = async () => {
    payBtn.current.disabled = true;

    try {
      const { data } = await axios.post('/api/v1/stripeclientkey', { amount: bookingDetails.totalPrice }, { headers: { "Content-Type": "application/json" } });
      const client_secret = data.client_secret;

      if (!stripe || !elements) return;

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
          billing_details: {
            name: bookingDetails.name,
            email: bookingDetails.email
          }
        }
      });

      if (result.error) {
        payBtn.current.disabled = false;
        dispatch(setError(result.error.message));
      } else {
        if (result.paymentIntent.status === "succeeded") {
          const paymentInfo = {
            id: result.paymentIntent.id,
            status: result.paymentIntent.status,
          };

          dispatch(newBookingAction({
            paymentInfo,
            dates: bookingDetails.dates,
            totalPrice: bookingDetails.totalPrice,
            phone: bookingDetails.phone
          }, bookingDetails.hotel, bookingDetails.room));

        } else {
          dispatch(setError("There's some issue while processing payment"));
        }
      }
    } catch (err) {
      payBtn.current.disabled = false;
      dispatch(setError(err.response.data.message));
    }
  }

  return (
    <Fragment>
      <Meta title="Payment" />
      <div className="mx-auto px-4 md:px-10 lg:px-20 xl:px-48 mt-4">
        <h2 className="text-2xl text-center font-medium mb-5 mt-40">Payment</h2>
        <div className="px-1 sm:px-3 flex justify-center">
          <div className="flex flex-col gap-4">
            <div className="flex items-center py-3 px-4 w-56 rounded border border-solid border-gray-500 " >
              <CardNumberElement className="w-full ml-2" />
            </div>
            <div className="flex items-center py-3 px-4 w-56 rounded border border-solid border-gray-500 " >
              <CardExpiryElement className="w-full ml-2" />
            </div>
            <div className="flex items-center py-3 px-4 w-56 rounded border border-solid border-gray-500 " >
              <CardCvcElement className="w-full ml-2" />
            </div>
            <button onClick={() => submitHandler()} type="submit" ref={payBtn} className="py-4 w-56 block text-center rounded bg-red-400 hover:bg-red-500 transition duration-200 text-zinc-50 disabled:cursor-not-allowed">{`Pay - ${bookingDetails?.totalPrice}`}</button>
          </div>
        </div>
      </div >
      <div className="mx-auto px-4 md:px-10 lg:px-20 xl:px-48 mt-4">
        <h2 className="text-2xl text-center font-medium mb-5 mt-4">Payment with PayPal</h2>
        <PayPalScriptProvider options={{ "client-id": paypalClientId }}>
          <PayPalButtons
            style={{ layout: "vertical" }}
            createOrder={(data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: bookingDetails.totalPrice,
                    },
                  },
                ],
              });
            }}
            onApprove={(data, actions) => {
            }}
          />
        </PayPalScriptProvider>
      </div>
    </Fragment>
  )
}
export default Payment;
