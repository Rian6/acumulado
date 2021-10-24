import React, { Fragment, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SQLite from 'expo-sqlite'

import XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import { FileSystem } from 'react-native-unimodules';
import {
  Button,
  DataTable,
  Searchbar,
  IconButton,
  ActivityIndicator,
  Paragraph,
  Dialog,
  Portal,
  Provider,
  Card,
  Title,
  Avatar
} from 'react-native-paper'

export default function App() {
  const [data, setData] = useState();
  const [msg, setMsg] = useState("Carregando...");
  const [dadoSelecionado, setDadoSelecionado] = useState();
  const [dataFilter, setDataFilter] = useState();
  const [isCarregando, setIsCarregando] = useState(false);

  const [searchQuery, setSearchQuery] = React.useState('');

  const [visible, setVisible] = React.useState(false);

  const hideDialog = () => setVisible(false);

  const onChangeSearch = query => setSearchQuery(query);

  const db = SQLite.openDatabase('db.planilhaDB')

  useEffect(() => {
    criarBanco()
    //deletarBanco()
    recuperarBanco()
  }, [1]);

  const criarBanco = async () => {
    await db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS planilha' +
        '(id INTEGER PRIMARY KEY AUTOINCREMENT,' +
        'LOGRADOURO TEXT,' +
        'COMPLEMENTO TEXT,' +
        'NUM_FACHADA TEXT,' +
        'CEP TEXT,' +
        'MUNICIPIO TEXT,' +
        'NOME_CDO TEXT,' +
        'TIPO_VIABILIDADE TEXT,' +
        'UF TEXT,' +
        'BAIRRO TEXT)'
      )
    })
  }

  async function recuperarBanco() {

    let dataTemp
    await db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM planilha',
        [],
        (tx, results) => {
          var temp = [];
          for (let i = 0; i < results.rows.length; ++i) {
            temp.push(results.rows.item(i));
            console.log(results.rows.item(i))
          }
          dataTemp = temp;
        }
      );
    });

    console.log(dataTemp)
  }

  async function deletarBanco() {
    await console.log("DELETANDO REGISTROS...")

    await db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM  planilha',
        (tx, results) => {
          console.log('Results', results.rowsAffected);
        }
      );
    });

    await console.log("DELETADO COM SUCESSO")
  }

  async function preencherBanco(dados) {

    let cont = 0
    await db.transaction(tx => {
      dados ?
        dados.map(dado => {
          db.transaction(function (tx) {
            tx.executeSql('INSERT INTO planilha (' +
              'LOGRADOURO, COMPLEMENTO, NUM_FACHADA, CEP, MUNICIPIO,' +
              'NOME_CDO, TIPO_VIABILIDADE, UF, BAIRRO)' +
              ') values (?,?,?,?,?,?,?,?,?)',
              [
                dado.LOGRADOURO + "", dado.COMPLEMENTO + "", dado.NUM_FACHADA + "", dado.CEP + "",
                dado.MUNICIPIO + "", dado.NOME_CDO + "", dado.TIPO_VIABILIDADE + "", dado.UF + "",
                dado.BAIRRO + "",
              ],
              (tx, results) => {
                console.log('Results', results.rowsAffected);
              });
          });
        })
        : null
    })
    setData(dados)
    console.log("Dados salvos: " + dados.length)
  }

  const carregarEndereco = async (endereco) => {
    setVisible(true)
    setDadoSelecionado(endereco)
  }

  const handleSearch = async () => {
    setIsCarregando(true)
    let results = await data.filter(d => {
      return (
        d
          .LOGRADOURO
          .toLowerCase()
          .includes(searchQuery.toLowerCase()
          ))
    })

    await results.length > 800 ?
      Alert.alert(
        "QUANTIDADE ALTA DE DADOS",
        "Você esta tentando carregar uma quantidade grande de dados, isso pode travar o app, deseja continuar mesmo assim?",
        [
          {
            text: "NÃO",
            onPress: () => setIsCarregando(false),
            style: "cancel"
          },
          { text: "SIM", onPress: () => setDataFilter(results) }
        ]
      ) :
      await setDataFilter(results)
    setIsCarregando(false)
  }

  // function picker file
  const handleDocument = async () => {
    setIsCarregando(true)
    let dataTemp

    try {
      await setMsg("Abrindo documento...")
      const fileDoc = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      if (fileDoc.type === "cancel") {
        setIsCarregando(false)
        return
      }

      if (fileDoc.type !== 'success') {
        setIsCarregando(false)
        return Alert.alert('Não foi possivel carregar o arquivo');
      }

      await setMsg("Extraindo dados...")
      await FileSystem.readAsStringAsync(`${fileDoc.uri}`, { encoding: FileSystem.EncodingType.Base64 })
        .then(b64 => XLSX.read(b64, { type: 'base64' }))
        .then(workbook => {
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];

          const dataFile = XLSX.utils.sheet_to_json(worksheet, { header: 0 });
          dataTemp = dataFile
        });
    } catch (err) {
      Alert.alert('Erro ao carregar arquivo!');
    }

    await setMsg("Salvando dados no celular...")
    await preencherBanco(dataTemp);
    await setIsCarregando(false)
  }

  const LeftContent = props => <Avatar.Icon
    style={{ backgroundColor: '#ff35c6' }}
    color={'black'}
    {...props} icon="home-city-outline" />


  //
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Provider>
        <View>
          {dadoSelecionado ?
            <Portal>
              <Dialog visible={visible} onDismiss={hideDialog}>

                <Card >
                  <Card.Title title={dadoSelecionado.LOGRADOURO + ", " + dadoSelecionado.NUM_FACHADA}
                    subtitle={dadoSelecionado.BAIRRO} left={LeftContent} />
                  <Card.Content>
                    <View style={{ alignItems: 'center' }}>
                      <Image
                        style={{
                          width: 200,
                          height: 100,
                          resizeMode: 'stretch',
                        }}
                        source={require('./images/house.png')}
                      />
                    </View>
                    <View style={{
                      borderRadius: 20,
                      backgroundColor: '#f3f6f1',
                      padding: 20
                    }}>
                      {dadoSelecionado.COMPLEMENTO ?
                        <Text>
                          {"COMPLEMENTO: " + dadoSelecionado.COMPLEMENTO + "\n"}
                        </Text>
                        : null
                      }
                      <Paragraph>{
                        "CEP: " + dadoSelecionado.CEP + "\n\n" +
                        "MUNICIPIO: " + dadoSelecionado.MUNICIPIO + "\n\n" +
                        "CDO: " + dadoSelecionado.NOME_CDO + "\n\n" +
                        "VIABILIDADE: " + dadoSelecionado.TIPO_VIABILIDADE + "\n\n" +
                        "UF: " + dadoSelecionado.UF
                      }</Paragraph>
                    </View>
                  </Card.Content>
                  <Button
                    style={{
                      width: 100,
                      margin: 20
                    }}
                    mode="outlined"
                    color="#ff35c6"
                    onPress={hideDialog}>FECHAR</Button>
                </Card>
              </Dialog>
            </Portal>
            : null}
        </View>

        <View style={styles.container}>
          {isCarregando ?
            <View style={styles.viewComponent}>
              <View style={{ alignItems: 'center', width: '100%' }}>
                <Image
                  style={{
                    width: 300,
                    height: 200,
                    resizeMode: 'stretch',
                  }}
                  source={require('./images/dreamer.png')}
                />
                <ActivityIndicator
                  size={50}
                  animating={true}
                  color={'#ff35c6'} />
                <Text>
                  {msg}
                </Text>
              </View>
            </View>
            :
            <View style={styles.viewComponent}>
              <Button style={styles.button} onPress={handleDocument}>
                <Text style={
                  {
                    color: '#fff',
                    fontSize: 16,
                  }}
                >
                  IMPORTAR ACUMULADO
                </Text>
              </Button>

              <View style={{ flexDirection: 'row', marginHorizontal: 10 }}>
                <Searchbar
                  style={styles.inputText}
                  placeholder="Buscar"
                  onChangeText={onChangeSearch}
                  value={searchQuery}
                />
                <IconButton
                  color="white"
                  // disabled={typeof data == 'undefined' || data.length == 0}
                  icon="home-search"
                  style={styles.button2}
                  onPress={handleSearch}
                  size={20}
                />
              </View>
              <Text style={
                {
                  fontSize: 16,
                }}
              >
                {data ? 'Registros: ' + data.length : 'Registros: ' + 0}
              </Text>
              <DataTable.Header>
                <DataTable.Title style={{ width: '60%' }}>LOGRADOURO</DataTable.Title>
                <DataTable.Title style={{ width: '20%' }}>COMPLEMENTO</DataTable.Title>
                <DataTable.Title style={{ width: '20%' }}>NUMERO</DataTable.Title>
              </DataTable.Header>
              <ScrollView style={styles.viewData} showsVerticalScrollIndicator={false}>

                <DataTable>
                  {
                    dataFilter && dataFilter.length != 0 ?

                      dataFilter.map(infos => {
                        return (
                          <TouchableOpacity onPress={() => carregarEndereco(infos)}>
                            <DataTable.Row>
                              <DataTable.Cell>
                                <Text style={{ width: '60%', fontSize: 10, }}>{infos.LOGRADOURO}</Text>
                              </DataTable.Cell>

                              <DataTable.Cell>
                                <Text style={{ width: '20%', fontSize: 10, }}>
                                  {infos.COMPLEMENTO}
                                </Text>
                              </DataTable.Cell>
                              <DataTable.Cell>
                                <Text style={{ width: 520, fontSize: 10, }}>{infos.NUM_FACHADA}</Text>
                              </DataTable.Cell>
                            </DataTable.Row>
                          </TouchableOpacity>
                        )
                      }) :
                      dataFilter ?
                        <View style={{ alignItems: 'center' }}>

                          <Image
                            style={{
                              width: 250,
                              height: 200,
                              resizeMode: 'stretch',
                            }}
                            source={require('./images/warning.png')}
                          />
                          <Text>
                            SEM REGISTROS
                          </Text>
                        </View>
                        :
                        <View style={{ alignItems: 'center' }}>
                          <Image
                            style={{
                              width: 200,
                              height: 200,
                              resizeMode: 'stretch',
                            }}
                            source={require('./images/buscar.png')}
                          />
                          <Text>
                            CLIQUE EM IMPORTAR PLANILHA
                          </Text>
                        </View>
                  }

                </DataTable>
              </ScrollView>

            </View>
          }
          <StatusBar style="light" backgroundColor="#ff35c6" />
        </View>
      </Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    top: StatusBar.currentHeight,
  },

  viewComponent: {
    top: 60,
    marginBottom: 130,
    alignItems: 'center',
    marginHorizontal: 20,
  },

  button: {
    height: 50,
    width: '100%',
    backgroundColor: '#ff35c6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginBottom: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  inputText: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 20,
    marginTop: 5,
    marginRight: 20,
    height: 50,
    width: '80%',
  },
  button2: {
    height: 50,
    backgroundColor: '#4a0bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    fontSize: 8,
    borderRadius: 8,
    width: '15%',
    shadowColor: '#000',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  viewData: {
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  textInfo: {
    fontSize: 16,
    color: '#888',
  }
});
