import { useContractWrite, usePrepareContractWrite } from "wagmi";
import { Form, Input, Button, InputNumber, Divider, notification } from "antd";
import { useState, useEffect } from "react";
import { Collapse } from "antd";
import {
  FormOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ABI } from "../contracts/votingContract";

const { Panel } = Collapse;

const VotingSettings = ({ votingAddress, isPrivate }) => {
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [addresses, setAdresses] = useState([]);

  console.log(isPrivate);

  const transactionIsSuccess = () => {
    notification.success({
      message: "Транзакция успешна",
      placement: "bottomRight",
    });
  };

  const transactionIsLoading = () => {
    notification.warning({
      message: "Проверьте ваш кошелек",
      placement: "bottomRight",
    });
  };

  const { config: titleConfig } = usePrepareContractWrite({
    address: votingAddress,
    abi: ABI,
    functionName: "changeTitle",
    args: [title],
  });
  const {
    isLoading: titleLoading,
    isSuccess: titleSuccess,
    write: changeTitle,
  } = useContractWrite(titleConfig);

  const { config: durationConfig } = usePrepareContractWrite({
    address: votingAddress,
    abi: ABI,
    functionName: "addDurationTime",
    args: [durationMinutes],
  });
  const {
    isLoading: durationLoading,
    isSuccess: durationSuccess,
    write: addDurationTime,
  } = useContractWrite(durationConfig);

  const { config: whitelistConfig } = usePrepareContractWrite({
    address: votingAddress,
    abi: ABI,
    functionName: "addToWhitelist",
    args: [addresses],
  });
  const {
    isLoading: whitelistLoading,
    isSuccess: whitelistSuccess,
    write: addToWhitelist,
  } = useContractWrite(whitelistConfig);

  useEffect(() => {
    if (titleLoading || durationLoading || whitelistLoading) {
      transactionIsLoading();
    }

    if (titleSuccess || durationSuccess || whitelistSuccess) {
      transactionIsSuccess();
    }
  }, [
    titleLoading,
    titleSuccess,
    durationLoading,
    durationSuccess,
    whitelistLoading,
    whitelistSuccess,
  ]);

  return (
    <>
      <Collapse accordion style={{ marginBottom: "20px" }}>
        <Panel header="Настройки голосования" key="1">
          <Form layout="vertical">
            <Form.Item
              required={false}
              label="Название"
              name="title"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Пожалуйста введите название",
                },
              ]}
            >
              <Input
                prefix={<FormOutlined style={{ color: "grey" }} />}
                allowClear
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Form.Item>
            <Form.Item
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Button danger htmlType="submit" onClick={() => changeTitle?.()}>
                Изменить название
              </Button>
            </Form.Item>
          </Form>
          <Divider />
          <Form layout="vertical">
            <Form.Item>
              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div style={{ marginRight: "10px" }}>Минуты:</div>
                <InputNumber
                  style={{ marginRight: "10px" }}
                  min={1}
                  max={10080}
                  value={durationMinutes}
                  onChange={setDurationMinutes}
                />
                <Button
                  danger
                  htmlType="submit"
                  onClick={() => addDurationTime?.()}
                >
                  Добавить время
                </Button>
              </div>
            </Form.Item>
            {isPrivate && (
              <>
                <Divider />
                <Form.Item>
                  <Form.List
                    name="addresses"
                    rules={[
                      {
                        validator: async (_, addresses) => {
                          if (!addresses || addresses.length < 1) {
                            return Promise.reject(
                              new Error("Как минимум 1 адрес")
                            );
                          }
                        },
                      },
                    ]}
                  >
                    {(_fields, { add, remove }, { errors }) => (
                      <>
                        {_fields.map((_field, index) => (
                          <Form.Item
                            label={index === 0 ? "Добавить адреса" : ""}
                            tooltip={
                              index === 0 ? "Добавить адреса в белый список" : ""
                            }
                            whitespace={true}
                            required={false}
                            key={_field.key}
                          >
                            <Form.Item
                              {..._field}
                              validateTrigger={["onChange", "onBlur"]}
                              rules={[
                                {
                                  required: true,
                                  whitespace: true,
                                  message: "Пожалуйста введите адрес",
                                },
                              ]}
                              noStyle
                            >
                              <Input
                                style={{}}
                                prefix={
                                  <UserOutlined style={{ color: "grey" }} />
                                }
                                allowClear
                                value={addresses[index]}
                                onChange={(e) => {
                                  const updateAddresses = [...addresses];
                                  updateAddresses[index] = e.target.value;
                                  setAdresses(updateAddresses);
                                }}
                              />
                            </Form.Item>
                            {_fields.length > 1 ? (
                              <MinusCircleOutlined
                                style={{
                                  color: "grey",
                                  position: "absolute",
                                  marginTop: "9px",
                                }}
                                onClick={() => {
                                  const updateAddresses = [...addresses];
                                  updateAddresses.splice(index, 1);
                                  setAdresses(updateAddresses);
                                  remove(_field.name);
                                }}
                              />
                            ) : null}
                          </Form.Item>
                        ))}
                        <Form.Item style={{ textAlign: "center" }}>
                          <Button
                            type="dashed"
                            onClick={() => {
                              add();
                              const updateAddresses = [...addresses];
                              updateAddresses.push("");
                              setAdresses(updateAddresses);
                            }}
                            style={{
                              width: "50%",
                            }}
                            icon={<PlusOutlined />}
                          >
                            Добавить адрес
                          </Button>
                          <Form.ErrorList errors={errors} />
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
                <Form.Item
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <Button
                    danger
                    htmlType="submit"
                    onClick={() => addToWhitelist?.()}
                  >
                    Добавить в белый список
                  </Button>
                </Form.Item>
              </>
            )}
          </Form>
        </Panel>
      </Collapse>
    </>
  );
};

export default VotingSettings;
