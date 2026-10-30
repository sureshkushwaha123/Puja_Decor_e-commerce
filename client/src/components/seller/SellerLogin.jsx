import React, { useEffect, useState } from 'react'
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const SellerLogin = () => {
    const {isSeller, setIsSeller, navigate, axios}=useAppContext();
    const [email, setEmail]=useState('');
    const [code, setCode]=useState('');
    const [codeRequested, setCodeRequested]=useState(false);
    const [resendWait, setResendWait]=useState(0);

    useEffect(()=>{
        if (isSeller) navigate('/seller');
    },[isSeller, navigate]);

    useEffect(() => {
        if (resendWait <= 0) return undefined;
        const timer = window.setTimeout(() => setResendWait((remaining) => remaining - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [resendWait]);

    const requestCode=async()=>{
        const {data}=await axios.post('/api/seller/otp/request',{email});
        if(!data.success){
            toast.error(data.message);
            return;
        }
        setCodeRequested(true);
        setResendWait(60);
        toast.success(data.message);
    };

    const verifyCode=async()=>{
        const {data}=await axios.post('/api/seller/otp/verify',{email,code});
        if(data.success){
            setIsSeller(true);
            navigate('/seller');
        }else{
            toast.error(data.message);
        }
    };

    const onSubmitHandler=async(event)=>{
        event.preventDefault();
        try {
            if(codeRequested) await verifyCode();
            else await requestCode();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Unable to continue');
        }
    };

    const resetOtp=()=>{
        setCodeRequested(false);
        setCode('');
        setResendWait(0);
    };

    return !isSeller && (
        <form onSubmit={onSubmitHandler} className='min-h-screen flex items-center text-sm text-gray-600'>
            <div className='flex flex-col gap-5 m-auto items-start p-8 py-12 min-w-80 sm:min-w-88 rounded-lg shadow-xl border border-gray-200'>
                <p className='text-2xl font-medium m-auto'><span className='text-primary'>Seller</span> Login </p>
                <div className='w-full'>
                    <p>Email</p>
                    <input onChange={(e)=> setEmail(e.target.value)} value={email} type="email" placeholder='Enter your email'
                    className='border border-gray-200 rounded w-full p-2 mt-1 outline-primary'
                    autoComplete='email' required disabled={codeRequested} />
                </div>

                {codeRequested && (
                    <div className='w-full'>
                        <p>Verification code</p>
                        <input onChange={(e)=> setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} value={code} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder='6-digit code'
                        className='border border-gray-200 rounded w-full p-2 mt-1 outline-primary tracking-[0.3em]' required />
                        <div className='flex justify-between mt-2'>
                            <button type='button' onClick={resetOtp} className='text-primary'>Change email</button>
                            <button type='button' onClick={requestCode} disabled={resendWait > 0} className='text-primary disabled:text-gray-400'>
                                {resendWait > 0 ? `Resend in ${resendWait}s` : 'Resend code'}
                            </button>
                        </div>
                    </div>
                )}

                <button className='bg-primary text-white rounded-md w-full py-2 mt-2 cursor-pointer'>
                    {codeRequested ? 'Verify and continue' : 'Send verification code'}
                </button>
            </div>
        </form>
    )
}

export default SellerLogin
