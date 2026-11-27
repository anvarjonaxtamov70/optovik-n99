import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Controls';
import { Field } from '../components/ui/Field';
import { FormScroll } from '../components/ui/FormScroll';
import { Header } from '../components/ui/Header';
import { Txt } from '../components/ui/Txt';
import { useT } from '../i18n';
import { useAccount } from '../state/account';
import { customerIdentityEnabled, linkCustomerEmail, signInCustomerEmail, resendCustomerVerification, refreshCustomerVerification, resetCustomerPassword } from '../state/customerIdentity';
import { confirmAsync } from '../lib/confirm';
import { showToast } from '../state/toast';
import { colors } from '../theme/tokens';

export default function CustomerAccountScreen(){
  const {t}=useT();
  const account=useAccount();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const lock=useRef(false);
  const act=async(mode:'link'|'login'|'resend'|'refresh'|'reset')=>{
    if(lock.current)return;
    lock.current=true;setBusy(true);
    try{
      if(mode==='login'&&!await confirmAsync(t('identity.login'),t('identity.loginConfirm'),{ok:t('identity.login'),cancel:t('common.cancel')}))return;
      if(mode==='link'){
        const sent=await linkCustomerEmail(email,password);
        showToast(t(sent?'identity.linked':'identity.linkedNoEmail'));
      }else if(mode==='login'){await signInCustomerEmail(email,password);showToast(t('identity.loggedIn'));}
      else if(mode==='resend'){await resendCustomerVerification();showToast(t('identity.mailSent'));}
      else if(mode==='refresh'){showToast(t(await refreshCustomerVerification()?'identity.verified':'identity.unverified'));}
      else{await resetCustomerPassword(account.email??email);showToast(t('identity.resetSent'));}
    }catch(error){
      showToast(t((error as {code?:string})?.code==='guest-history'?'identity.guestHistory':'common.error'),{kind:'error'});
    }finally{setPassword('');lock.current=false;setBusy(false);}
  };
  return <View style={styles.root}>
    <Header title={t('identity.title')}/>
    <FormScroll contentContainerStyle={styles.body}>
      {!customerIdentityEnabled?<Txt>{t('identity.unavailable')}</Txt>:!account.ready||!account.uid?<Txt>{t('identity.unavailable')}</Txt>:account.anonymous?<>
        <Card style={styles.gap}>
          <Txt variant="h3">{t('identity.title')}</Txt>
          <Txt variant="small">{t('identity.linkHint')}</Txt>
          <Field label={t('identity.email')} value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" maxLength={254}/>
          <Field label={t('identity.password')} value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128}/>
          <Button title={t('identity.link')} loading={busy} onPress={()=>{void act('link');}}/>
          <Button title={t('identity.login')} variant="outline" disabled={busy} onPress={()=>{void act('login');}}/>
          <Button title={t('identity.reset')} variant="ghost" disabled={busy} onPress={()=>{void act('reset');}}/>
        </Card>
      </>:<Card style={styles.gap}>
        <Txt variant="h3">{account.email??t('identity.title')}</Txt>
        <Txt>{t(account.emailVerified?'identity.verified':'identity.unverified')}</Txt>
        {!account.emailVerified?<Button title={t('identity.resend')} loading={busy} onPress={()=>{void act('resend');}}/>:null}
        <Button title={t('identity.refresh')} variant="outline" disabled={busy} onPress={()=>{void act('refresh');}}/>
        <Button title={t('identity.reset')} variant="ghost" disabled={busy} onPress={()=>{void act('reset');}}/>
      </Card>}
    </FormScroll>
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg},body:{padding:16,paddingBottom:40,gap:14},gap:{gap:12}});
