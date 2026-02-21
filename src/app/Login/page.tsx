"use client";
import Cookies from 'js-cookie';
import 'bootstrap/dist/css/bootstrap.min.css';
import styles from "../page.module.css";
import Image from "next/image";
import FontAwesomeIcon from "../Component/fontAwesome.jsx";
import { useEffect, useRef } from 'react';
import { getTokenByUser } from '../Api/apiUser';



export default function Login() {

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const getTokenApi = async () => {
    const username = usernameRef.current!.value;
    const password = passwordRef.current!.value;
    const queryParams = { USER_NAME: username, PASSWORD: password };
    const response = await getTokenByUser(queryParams);
    if(response.success){
      Cookies.set('token', response.access_token);
      const queryParameters = new URLSearchParams(window.location.search)
      var return_url = queryParameters.get("redirectUrl");
      window.location.href = return_url ? window.location.origin + return_url : window.location.origin + '/Admin'
    }
  };


  return (
    <section className={`vh-100 ${styles.backgroundRegis}`}>
      <div className="container h-100">
        <div className="row d-flex justify-content-center align-items-center h-100">
          <div className="col-lg-12 col-xl-11">
            <div className={`card text-black ${styles.regisContainer}`}>
              <div className="card-body p-md-5">
                <div className="row justify-content-center">
                  <div className="col-md-9 col-lg-6 col-xl-5">
                    <Image
                      src="/login.png"
                      alt="Ảnh bị ẩn do mạng"
                      className='img-fluid'
                      width={500}
                      height={300}
                    />
                  </div>
                  <div className="col-md-8 col-lg-6 col-xl-4 offset-xl-1">
                    <form>
                      <div className="d-flex flex-row align-items-center justify-content-center justify-content-lg-start">
                        <p className={`text-center h1 fw-bold mb-5 mx-1 mx-md-4 mt-4`}>Sign in</p>
                      </div>
                      <div className="d-flex flex-row align-items-center mb-4">
                        <FontAwesomeIcon icon="user" className={`fa-solid fa-user ${styles.iconRegis}`} />
                        <div className="form-outline flex-fill mb-0">
                          <input type="text" id="userAccount" className="form-control" placeholder='Enter Your UserName' ref={usernameRef} />
                        </div>
                      </div>

                      <div className="d-flex flex-row align-items-center mb-4">
                        <FontAwesomeIcon icon="lock" className={`fa-solid fa-lock ${styles.iconRegis}`} />
                        <div className="form-outline flex-fill mb-0">
                          <input type="password" id="passWordAccount" className="form-control" placeholder='Enter Your Password' ref={passwordRef} />
                        </div>
                      </div>

                      <div className="text-center text-lg-start mt-4 pt-2">
                        <button type="button" className={`btn btn-primary btn-lg ${styles.loginPass}`} onClick={getTokenApi}>Login</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}