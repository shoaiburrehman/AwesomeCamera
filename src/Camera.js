import React, {useRef, useState} from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Alert, ToastAndroid, ActivityIndicator } from 'react-native';
import {RNCamera} from 'react-native-camera';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';
import { ProcessingManager } from 'react-native-video-processing';
import {Stopwatch, Timer} from 'react-native-stopwatch-timer';
import Icon from "react-native-vector-icons/Ionicons";
import moment from "moment";
import ModalView from './ModalView';
import useOrientation from './orientation';

const Camera = ({navigation}) => {
    const cameraRef = useRef();
    const [loader, setLoader] = useState(false)
    const [cameraType, setCameraType] = useState('Photo')
    const [captureType, setCaptureType] = useState('back')
    const [mirrorMode, setMirrorMode] = useState(false)
    const [toggleCameraAction, setToggleCameraAction] = useState(false)
    const [ filter, setFilter ] = useState(['Unchanged','Compressed']);
    const [isStopwatchStart, setIsStopwatchStart] = useState(false);
    const [uriPicture, setPictureURI] = useState('')
    const [watchMin, setWatchMin] = useState("00");
    const [watchSec, setWatchSec] = useState("00");
    const [ filterView, setFilterView ] = useState( false );
    const [picture_compressed, setState] = useState({
        fileName: '',
        uri: '',
        type: ''
    })

    const orientation = useOrientation();

    const onCameraAction = async() => {
        console.warn("cameraRef: ", cameraRef)
        if(cameraRef && cameraType === "Video" && !toggleCameraAction){
           setToggleCameraAction(true)
           setLoader(true)
            try {
                setIsStopwatchStart(true)
                const { uri, codec = "mp4" } = await cameraRef.current.recordAsync();
                setPictureURI(uri);
                setFilterView(true);
                // SaveToStorage(uri, cameraType);
                setLoader(false)
            } catch (err) {
                setLoader(false)
                Alert.alert('Error', 'Failed to record video: ' + (err.message || err));
            }
        }
        if(toggleCameraAction && cameraType === "Video"){
            cameraRef.current.stopRecording();
            setWatchMin("00");
            setWatchSec("00");
            setIsStopwatchStart(false)
            setToggleCameraAction(false)
        }
        if(cameraType === "Photo"){
            let options = {
                quality: 1,
                fixOrientation: true,
                forceUpOrientation: true,
                // base64: true
            };
            try {
                setLoader(true)
                const data = await cameraRef.current.takePictureAsync(options);
                console.warn("data: ", data);
                setFilterView(true);
                setPictureURI(data);
                // SaveToStorage(data.uri, cameraType);
                setLoader(false)
            } catch (err) {
                setLoader(false)
                Alert.alert('Error', 'Failed to take picture: ' + (err.message || err));
            }
        }
    }
    
    const SaveToStorage = (uri, camType, fileName) => {
        let uriPicture = uri.replace('file://', '');
        //RNFS.copyFile(data.uri, RNFS.PicturesDirectoryPath + '/Videos/' + fileName).then(() => {
        RNFS.copyFile(uriPicture, "/storage/emulated/0/Download/" + fileName).then(() => {
        // RNFS.copyFile(uriPicture, '/sdcard/DCIM/' + fileName).then(() => {
            ToastAndroid.show( camType+' Saved', ToastAndroid.SHORT)
            console.warn(camType+" copied locally!!");
        }, (error) => {
            Alert.alert("CopyFile fail for "+camType+": " + error);
        });
    }

    const selectSizeToSave = async(i) => {
        if(i === 'Unchanged'){
            let fileName
            if(cameraType === 'Photo'){
                fileName = `${cameraType}_${moment().format('YYYYMMDDHHMMSS')}.jpg`;
                SaveToStorage(uriPicture.uri, cameraType, fileName);
            }
            else{
                fileName = `${cameraType}_${moment().format('YYYYMMDDHHMMSS')}.mp4`;
                const thumbnail =  await ProcessingManager.getPreviewForSecond(uriPicture);
                navigation.navigate("mediaScreen", {thumbnail: thumbnail, uri: uriPicture})
                SaveToStorage(uriPicture, cameraType, fileName);
            }
        }
        else{
            if(cameraType === 'Photo'){
                imageResize(uriPicture.uri, cameraType);
            }
            else{
                compressVideo(uriPicture, cameraType);
            }
        }
        setFilterView( false );
    }

    const imageResize = (uri, camType) => {
        ImageResizer.createResizedImage(
            uri,
            360,
            360,
            'JPEG',
            95,
            0,
            null,
        )
        .then((resizeResponse) => {
            console.warn("resizeResponse: ", resizeResponse)
            let imageName = uri;
            let uploadUri = resizeResponse.uri;
            let fileName = `${camType}_${resizeResponse.name}`;
            SaveToStorage(uploadUri, camType, fileName);
            setState({
                fileName: imageName,
                uri: uploadUri,
                type: "image/jpeg"
            })
        })
        .catch((err) => {
            Alert.alert("Image Resizing Error", err);
        });
    }
    
    const compressVideo = async(uri, camType) => {
        let fileName = `${camType}_${moment().format('YYYYMMDDHHMMSS')}.mp4`;
        const origin = await ProcessingManager.getVideoInfo(uri);
        try{
            const result = await ProcessingManager.compress(uri, {
                width: origin.size && origin.size.width,
                height: origin.size && origin.size.height,
                bitrateMultiplier: 7,
                minimumBitrate: 300000
            })
            const thumbnail =  await ProcessingManager.getPreviewForSecond(result.source);
            navigation.navigate("mediaScreen", {thumbnail: thumbnail, uri: result.source})
            SaveToStorage(result.source, camType, fileName);
            console.warn("result compress vid: ", result);
        }
        catch(err) {
            Alert.alert("Compress Video Error", err);
        };
    }

    const cameraReverse = () => {
        if(captureType === 'back') setCaptureType('front');
        else setCaptureType('back');
        setMirrorMode(!mirrorMode);
    }

    return (
        <View style={styles.container}>
            <ModalView 
                title={'Select Size you want to save'} 
                containerStyle={{width: orientation === 'PORTRAIT' ? '70%' : '35%', paddingVertical: orientation === 'PORTRAIT' ? '70%' : '10%'}} 
                style={styles.modalStyle} 
                visible={ filterView } 
                setVisible={ setFilterView } 
                filters={ filter } 
                onSelect={ selectSizeToSave } />
                
            <RNCamera 
                ref={cameraRef}
                style = {styles.container}
                captureAudio={true}
                type={captureType === 'back' ? RNCamera.Constants.Type.back : RNCamera.Constants.Type.front}
                mirrorImage={mirrorMode}
                androidCameraPermissionOptions={{
                    title: 'Permission to use camera',
                    message: 'We need your permission to use your camera',
                    buttonPositive: 'Ok',
                    buttonNegative: 'Cancel',
                }}
                androidRecordAudioPermissionOptions={{
                    title: 'Permission to use audio recording',
                    message: 'We need your permission to use your audio',
                    buttonPositive: 'Ok',
                    buttonNegative: 'Cancel',
                }}
            >
                <View style={styles.bottomView}>
                    {isStopwatchStart && cameraType === 'Video' ?
                        <Stopwatch
                            laps
                            // hours={watchMin === "59" && watchSec === "59" ? true : false}
                            start={isStopwatchStart}
                            options={options}
                            getTime={(time) => {
                                // let min = time.split(':')[0]                // logic to enable hrs
                                // let sec = time.split(':')[1]
                                // console.log(min, sec)
                                // console.log(watchMin, watchSec)
                                // if(watchMin !== min){
                                //     console.warn("CONDITION TRUE MIN")
                                //     setWatchMin(min);
                                // }
                                // if(sec === "59" && watchSec !== sec){
                                //     console.warn("CONDITION TRUE SEC")
                                //     setWatchSec(sec);
                                // }
                            }}
                        />
                    :
                        <>
                            <TouchableOpacity style={{borderBottomColor: cameraType === 'Photo' ? 'yellow': 'white', borderBottomWidth: cameraType === 'Photo' ? 1 : 0}} onPress={() => setCameraType('Photo')}>
                                <Text style={[styles.textStyle, {color: cameraType === 'Photo' ? 'yellow' : 'white'}]}>Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{borderBottomColor: cameraType === 'Video' ? 'yellow': 'white', borderBottomWidth: cameraType === 'Video' ? 1 : 0, marginLeft: 30}} onPress={() => setCameraType('Video')}>
                                <Text style={[styles.textStyle, {color: cameraType === 'Video' ? 'yellow' : 'white'}]}>Video</Text>
                            </TouchableOpacity>
                            <View style={{position: 'absolute', right: 20}}>
                                <TouchableOpacity activeOpacity={0.7} style={styles.touchableCamera} onPress = {() => cameraReverse()}>
                                    <View style={styles.cameraView}>
                                        <Icon name = "camera-reverse" size = { 30 } color = "white"/>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </>
                    }
                </View>
                <View style={styles.onPictureView}>
                    {loader && ((cameraType === "Photo") || (cameraType === "Video" && !toggleCameraAction)) ?
                        <View style={styles.onPictureClick}>
                            <ActivityIndicator size={75} color="#ffffff" />
                        </View>
                    :
                        <TouchableOpacity activeOpacity={0.8} style={styles.onPictureClick} onPress={() => onCameraAction()}>
                            {cameraType === "Video" ?
                                <View style={[styles.onPictureCircleView, {backgroundColor: toggleCameraAction ? 'red' : 'white'}]}></View>
                            :
                                <View style={styles.onPictureCircleView}></View>
                            }
                        </TouchableOpacity>
                    }
                </View>
            </RNCamera>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    modalStyle:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: "white",
        borderRadius: 5,
    },   
    bottomView: {
        flexDirection: 'row',
        width: '100%',
        height: '10%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 100,
    },
    textStyle: {
      color: '#fff',
      fontSize: 20,
    },
    onPictureView: {
        width: '100%',
        height: '15%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
    },
    onPictureClick: {
        width: 80,
        height: 80,
        borderRadius: 80/2,
        borderColor: 'white',
        borderWidth: 3,
    },
    onPictureCircleView: {
        position: 'absolute',
        bottom: 4.5,
        alignSelf: 'center',
        width: 65,
        height: 65,
        borderRadius: 65/2,
        borderColor: 'white',
    },
    touchableCamera: {
        width: 60, 
        height: 60, 
        borderRadius: 60/2, 
        backgroundColor: 'rgba(0,0,0,0.3)', 
    },
    cameraView: {
        flex: 1, 
        alignSelf: 'center', 
        justifyContent: 'center'
    }
});

const options = {
    container: {
        // backgroundColor: '#ffffff',
        padding: 5,
        borderRadius: 5,
        width: 200,
        alignItems: 'center',
    },
    text: {
        fontSize: 25,
        color: '#FFF',
        marginLeft: 7,
    },
};

export default Camera;