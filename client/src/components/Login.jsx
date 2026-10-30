import React from 'react'
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const Login = () => {
    const {setShowUserLogin, setUser, fetchUser, axios, navigate}=useAppContext();
    const [state, setState] = React.useState('login');
    const [step, setStep] = React.useState('email');
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [code, setCode] = React.useState('');
    const [resendWait, setResendWait] = React.useState(0);
    const [accountNotFound, setAccountNotFound] = React.useState(false);

    React.useEffect(() => {
        if (resendWait <= 0) return undefined;
        const timer = window.setTimeout(() => setResendWait((remaining) => remaining - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [resendWait]);

    const finishLogin = async (user) => {
        setUser(user);
        await fetchUser();
        setShowUserLogin(false);
        navigate('/');
    };

    const requestCode = async () => {
        const mode = state === 'register' ? 'signup' : 'login';
        const {data} = await axios.post('/api/user/otp/request', {name, email, mode});
        if (!data.success) {
            toast.error(data.message);
            return;
        }
        setAccountNotFound(false);
        setStep('code');
        setResendWait(60);
        toast.success(data.message);
    };

    const verifyCode = async () => {
        const mode = state === 'register' ? 'signup' : 'login';
        const {data} = await axios.post('/api/user/otp/verify', {email, code, mode});
        if (!data.success) {
            toast.error(data.message);
            return;
        }
        await finishLogin(data.user);
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        try {
            if (step === 'email') await requestCode();
            else await verifyCode();
        } catch (error) {
            if (error.response?.data?.code === 'ACCOUNT_NOT_FOUND') {
                setAccountNotFound(true);
                setStep('email');
                return;
            }
            toast.error(error.response?.data?.message || error.message || 'Unable to continue');
        }
    };

    const isSignup = state === 'register';
    const changeState = (nextState) => {
        setState(nextState);
        setStep('email');
        setCode('');
        setAccountNotFound(false);
    };

    return (
        <div onClick={()=> setShowUserLogin(false)} className='fixed top-0 bottom-0 left-0 right-0 z-30 flex items-center text-sm text-gray-600 bg-black/50'>
            <form onSubmit={onSubmitHandler} onClick={(e)=> e.stopPropagation()} className="flex flex-col gap-4 m-auto items-start p-8 py-12 w-80 sm:w-[352px] text-gray-500 rounded-lg shadow-xl border border-gray-200 bg-white">
                <p className="text-2xl font-medium m-auto">
                    <span className="text-primary">User</span> {isSignup ? 'Sign Up' : 'Login'}
                </p>

                {isSignup && (
                    <div className="w-full">
                        <p>Name</p>
                        <input onChange={(e) => setName(e.target.value)} value={name} placeholder="Your name" className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary" type="text" maxLength={100} required disabled={step === 'code'} />
                    </div>
                )}

                <div className="w-full">
                    <p>Email</p>
                    <input onChange={(e) => { setEmail(e.target.value); setAccountNotFound(false); }} value={email} placeholder="you@example.com" className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary" type="email" autoComplete="email" required disabled={step === 'code'} />
                </div>

                {accountNotFound && (
                    <p role="alert" className="w-full text-red-600">
                        Account not found. Please create an account first.{' '}
                        <button type="button" onClick={() => changeState('register')} className="text-primary underline">Create an account</button>
                    </p>
                )}

                {step === 'code' && (
                    <div className="w-full">
                        <p>Verification code</p>
                        <input onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} value={code} placeholder="6-digit code" className="border border-gray-200 rounded w-full p-2 mt-1 outline-primary tracking-[0.3em]" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
                        <button type="button" onClick={() => { setStep('email'); setCode(''); }} className="text-primary mt-2">Change email</button>
                    </div>
                )}

                <div className="flex justify-between w-full text-sm">
                    <button type="button" onClick={() => changeState(isSignup ? 'login' : 'register')} className="text-primary">
                        {isSignup ? 'Already have an account? Login' : 'Create an account'}
                    </button>
                    {step === 'code' && (
                        <button type="button" onClick={requestCode} disabled={resendWait > 0} className="text-primary disabled:text-gray-400">
                            {resendWait > 0 ? `Resend in ${resendWait}s` : 'Resend code'}
                        </button>
                    )}
                </div>

                <button className="bg-primary hover:bg-primary-dull transition-all text-white w-full py-2 rounded-md cursor-pointer">
                    {step === 'email' ? 'Send verification code' : 'Verify and continue'}
                </button>
            </form>
        </div>
    );
}

export default Login
