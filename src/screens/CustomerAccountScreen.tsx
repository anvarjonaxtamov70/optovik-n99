import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Controls';
import { Field } from '../components/ui/Field';
import { FormScroll } from '../components/ui/FormScroll';
import { Header } from '../components/ui/Header';
import { Txt } from '../components/ui/Txt';
import { useT, type TKey } from '../i18n';
import {identityErrorKey,validAccountEmail,validAccountPassword} from '../domain/customerIdentity';
import {Notice} from '../components/shop/CatalogBits';
import { useAccount } from '../state/account';
import { customerIdentityEnabled, linkCustomerEmail, signInCustomerEmail, resendCustomerVerification, refreshCustomerVerification, resetCustomerPassword, signOutCustomer } from '../state/customerIdentity';
import { confirmAsync } from '../lib/confirm';
import { showToast } from '../state/toast';
import { colors } from '../theme/tokens';

export default function CustomerAccountScreen(){
  const {t}=useT();
  const account=useAccount();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [errorKey,setErrorKey]=useState<TKey|null>(null);
  const validEmail=validAccountEmail(email),validPassword=validAccountPassword(password);
  const lock=useRef(false);
  const act=async(mode:'link'|'login'|'resend'|'refresh'|'reset'|'logout')=>{
    if(lock.current)return;
    setErrorKey(null);
    if((mode==='link'||mode==='login'||(mode==='reset'&&!account.email))&&!validEmail){setErrorKey('identity.invalidEmail');return;}
    if((mode==='link'||mode==='login')&&!validPassword){setErrorKey('identity.invalidPassword');return;}
    lock.current=true;setBusy(true);
    try{
      if(mode==='login'&&!await confirmAsync(t('identity.login'),t('identity.loginConfirm'),{ok:t('identity.login'),cancel:t('common.cancel')}))return;
      if(mode==='logout'){
        if(!await confirmAsync(t('identity.logout'),t('identity.logoutConfirm'),{ok:t('identity.logout'),cancel:t('common.cancel'),destructive:true}))return;
        await signOutCustomer();setEmail('');showToast(t('identity.loggedOut'));
      }else if(mode==='link'){
        const sent=await linkCustomerEmail(email,password);
        showToast(t(sent?'identity.linked':'identity.linkedNoEmail'));
      }else if(mode==='login'){await signInCustomerEmail(email,password);showToast(t('identity.loggedIn'));}
      else if(mode==='resend'){await resendCustomerVerification();showToast(t('identity.mailSent'));}
      else if(mode==='refresh'){showToast(t(await refreshCustomerVerification()?'identity.verified':'identity.unverified'));}
      else{await resetCustomerPassword(account.email??email);showToast(t('identity.resetSent'));}
    }catch(error){
      const key=identityErrorKey(error,mode);
      setErrorKey(key);
      if(__DEV__)console.info('[N99 identity]',{mode,category:key});
      if(key!=='identity.guestHistory'&&key!=='identity.logoutBlocked')showToast(t(key),{kind:'error'});
    }finally{setPassword('');lock.current=false;setBusy(false);}
  };
  return <View style={styles.root}>
    <Header title={t('identity.title')}/>
    <FormScroll contentContainerStyle={styles.body}>
      {!customerIdentityEnabled?<Txt>{t('identity.unavailable')}</Txt>:!account.ready||!account.uid?<Txt>{t('identity.unavailable')}</Txt>:account.anonymous?<>
        <Card style={styles.gap}>
          <Txt variant="h3">{t('identity.title')}</Txt>
          <Txt variant="small">{t('identity.linkHint')}</Txt>
          <Field label={t('identity.email')} value={email} onChangeText={v=>{setEmail(v);setErrorKey(null);}} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" maxLength={254}/>
          <Field label={t('identity.password')} value={password} onChangeText={v=>{setPassword(v);setErrorKey(null);}} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128}/>
          {errorKey?<Notice icon="alert-circle-outline" tone="warning" text={t(errorKey)}/>:null}
          <Button title={t('identity.link')} loading={busy} disabled={!validEmail||!validPassword} onPress={()=>{void act('link');}}/>
          <Button title={t('identity.login')} variant="outline" disabled={busy||!validEmail||!validPassword} onPress={()=>{void act('login');}}/>
          <Button title={t('identity.reset')} variant="ghost" disabled={busy} onPress={()=>{void act('reset');}}/>
        </Card>
      </>:<Card style={styles.gap}>
        <Txt variant="h3">{account.email??t('identity.title')}</Txt>
        <Txt>{t(account.emailVerified?'identity.verified':'identity.unverified')}</Txt>
        {errorKey?<Notice icon="alert-circle-outline" tone="warning" text={t(errorKey)}/>:null}
        {!account.emailVerified?<Button title={t('identity.resend')} loading={busy} onPress={()=>{void act('resend');}}/>:null}
        <Button title={t('identity.refresh')} variant="outline" disabled={busy} onPress={()=>{void act('refresh');}}/>
        <Button title={t('identity.reset')} variant="ghost" disabled={busy} onPress={()=>{void act('reset');}}/>
        <Button title={t('identity.logout')} variant="outline" disabled={busy} onPress={()=>{void act('logout');}}/>
      </Card>}
    </FormScroll>
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},body:{padding:16,paddingBottom:40,gap:14},gap:{gap:12}});
