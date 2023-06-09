import React, { useEffect, useState, useMemo } from "react";
import {
  useContractWrite,
  useContractRead,
  usePrepareContractWrite,
  useAccount,
} from "wagmi";
import {
  Modal,
  Select,
  Button,
  Alert,
  Input,
  Switch,
  Typography,
  Row,
  Col,
  Card,
  Progress,
  notification,
  Divider,
  Spin,
} from "antd";
import {
  Address as factoryAddress,
  ABI as factoryABI,
} from "../contracts/factoryContract";
import { ABI as votingABI } from "../contracts/votingContract";
import { ethers } from "ethers";
import useCheckIdentity from "../utils/isIdentified";
import { ClockCircleOutlined } from "@ant-design/icons";
import VotingSettings from "./VotingSettings";
import useCheckKYC from "../utils/isKYC";
import useGetIsModerator from "../utils/isModerator";
import VotingModeration from "./VotingModeration";
import getRandomGradient from "../utils/getRandomGradient";

const { Text } = Typography;

const VotingCards = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedVoting, setSelectedVoting] = useState(null);
  const [titles, setTitles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [kycStatuses, setKycStatuses] = useState([]);
  const [privateStatuses, setPrivateStatuses] = useState([]);
  const [gradients, setGradients] = useState([]);
  const [loading, setLoading] = useState(true);

  const provider = window.ethereum
    ? new ethers.providers.Web3Provider(window.ethereum)
    : new ethers.providers.JsonRpcProvider(
        "https://data-seed-prebsc-1-s1.binance.org:8545/"
      );
  const isUserVerified = useCheckIdentity();
  const isUserKYC = useCheckKYC();
  const isUserModerator = useGetIsModerator();
  const { address: userAddress } = useAccount();

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

  const getTimestamp = async () => {
    const block = await provider.getBlock();
    setCurrentTimestamp(block.timestamp);
  };

  const { data } = useContractRead({
    address: factoryAddress,
    abi: factoryABI,
    functionName: "getDeployedVotings",
  });

  const { data: chairPerson } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "chairPerson",
  });

  const { data: voters } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "addressToVoter",
    args: [userAddress],
  });

  const { data: winnerName } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "getWinnerName",
  });

  const { data: endTime } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "endTime",
  });

  const { data: proposalNames } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "getProposalsNames",
  });

  const { data: proposalVotes } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "getProposalsVotes",
  });

  const { data: isContractKYC } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "isKYC",
  });

  const { data: isWhitelisted } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "addressToWhitelist",
    args: [userAddress],
  });

  const { data: isPrivate } = useContractRead({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "isPrivate",
  });

  const { config: voteConfig } = usePrepareContractWrite({
    address: data?.[selectedVoting],
    abi: votingABI,
    functionName: "vote",
    args: [selectedProposal],
  });
  const { isLoading, isSuccess, write: vote } = useContractWrite(voteConfig);

  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return "~1м";
    }

    const weeks = Math.floor(seconds / 604800);
    seconds %= 604800;
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    const formattedDuration = [
      weeks > 0 && `${weeks}н`,
      days > 0 && `${days}д`,
      hours > 0 && `${hours}ч`,
      minutes > 0 && `${minutes}м`,
    ]
      .filter(Boolean)
      .join(" ");

    return formattedDuration;
  };

  const showModal = (index) => {
    setSelectedProposal(null);
    setSelectedVoting(index);
    setIsModalVisible(true);
    getTimestamp();
  };

  const handleCancel = () => {
    setSelectedProposal(null);
    setIsModalVisible(false);
  };

  const filteredList = useMemo(() => {
    if (!searchQuery) return titles.map((title, index) => ({ index, title }));

    return titles
      .map((title, index) => ({ index, title }))
      .filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          data[item.index].toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [searchQuery, titles, data]);

  useEffect(() => {
    if (data) {
      const fetchData = async () => {
        const newTitles = [];
        const newKycStatuses = [];
        const newPrivateStatuses = [];
        for (const address of data) {
          const contract = new ethers.Contract(address, votingABI, provider);
          const title = await contract.title();
          const kycStatus = await contract.isKYC();
          const privateStatus = await contract.isPrivate();
          newTitles.push(title);
          newKycStatuses.push(kycStatus);
          newPrivateStatuses.push(privateStatus);
        }
        setTitles(newTitles);
        setKycStatuses(newKycStatuses);
        setLoading(false);
        setPrivateStatuses(newPrivateStatuses);
      };
      fetchData();
    }
  }, [data]);

  useEffect(() => {
    const newGradients = filteredList.map(() => getRandomGradient());
    setGradients(newGradients);
  }, [filteredList]);

  useEffect(() => {
    if (isLoading) {
      transactionIsLoading();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isSuccess) {
      transactionIsSuccess();
    }
  }, [isSuccess]);

  function TimeRemaining() {
    return (
      <Alert
        message={`Времени до окончания: ${formatDuration(
          endTime - currentTimestamp
        )}.`}
        showIcon
        icon={<ClockCircleOutlined />}
      />
    );
  }

  const calculatePercentage = (votes, totalVotes) => {
    return (votes / totalVotes) * 100;
  };

  const totalVotes = proposalVotes?.reduce(
    (acc, votes) => acc + Number(votes),
    0
  );

  if (isUserVerified === undefined) {
    return;
  }

  if (!isUserVerified) {
    return;
  }

  const renderModalContent = () => {
    if (currentTimestamp >= endTime) {
      if (winnerName === undefined) {
        return (
          <Alert
            message="Ошибка"
            description="Голосование закончилось с ничьей."
            type="error"
            showIcon
          />
        );
      }
      return (
        <Alert
          message="Окончено"
          description={`Выиграл кандидат: "${winnerName}".`}
          type="success"
          showIcon
        />
      );
    }

    if (userAddress === chairPerson) {
      return (
        <>
          <VotingSettings
            votingAddress={data[selectedVoting]}
            isPrivate={isPrivate}
          />
          <TimeRemaining />
          <br />
          <Alert
            message="Создатель голосования не может голосовать."
            type="warning"
            showIcon
          />
        </>
      );
    }

    if (data?.[selectedVoting] && voters?.voted) {
      return (
        <>
          <TimeRemaining />
          <br />
          <Alert
            message={`Вы уже проголосовали. Ваш выбор: ${
              proposalNames?.[voters?.choice]
            }`}
            type="warning"
            showIcon
          />
        </>
      );
    }

    if (isPrivate && !isWhitelisted) {
      return (
        <>
          <TimeRemaining />
          <br />
          <Alert
            message="Вас нет в белом списке"
            description="Вы не можете тут голосовать, так как не находитель в белом списке."
            type="warning"
            showIcon
          />
          {isContractKYC && !isUserKYC && (
            <>
              <br />
              <Alert
                message="Вы не идентифецированы"
                description="Пройдите верификацию статуса KYC чтобы получить больше возможностей."
                type="warning"
                showIcon
              />
            </>
          )}
        </>
      );
    }

    if (isContractKYC && !isUserKYC) {
      return (
        <>
          <TimeRemaining />
          <br />
          <Alert
            message="Вы не идентифецированы"
            description="Пройдите верификацию статуса KYC чтобы получить больше возможностей."
            type="warning"
            showIcon
          />
        </>
      );
    }

    return (
      <>
        <TimeRemaining />
        <br />

        <Select
          value={selectedProposal}
          placeholder="Выберите участника"
          style={{ width: "100%" }}
          onChange={(value) => setSelectedProposal(value)}
        >
          {proposalNames &&
            proposalNames?.map((proposalName, index) => (
              <Select.Option key={index} value={index}>
                {proposalName}
              </Select.Option>
            ))}
        </Select>
        <Button
          key="submit"
          type="primary"
          onClick={() => vote?.()}
          style={{ marginTop: "16px" }}
        >
          Проголосовать
        </Button>
      </>
    );
  };

  return (
    <>
      <h1
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Голосования
      </h1>
      <Input
        placeholder="Поиск по адресу или названию"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
      />
      <Spin spinning={loading}>
        <Row
          gutter={[16, 16]}
          style={{ marginTop: "40px", marginBottom: "15px" }}
        >
          {filteredList.map((item, index) => (
            <Col xs={24} sm={24} md={12} lg={12} xl={8} key={item.index}>
              <Card hoverable>
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    borderRadius: "10px",
                    background: gradients[index],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    cursor: "pointer",
                  }}
                  onClick={() => showModal(item.index)}
                >
                  <Typography.Title
                    level={4}
                    style={{
                      color: "white",
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "normal",
                    }}
                  >
                    {item.title}
                  </Typography.Title>
                </div>
                <Card.Meta
                  style={{ textAlign: "center", padding: "10px" }}
                  description={`Адрес голосования: ${data[item.index]}`}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-evenly",
                    marginTop: "10px",
                  }}
                >
                  {kycStatuses[item.index] && (
                    <Switch
                      size="small"
                      checkedChildren="KYC"
                      disabled
                      defaultChecked
                    />
                  )}
                  {privateStatuses[item.index] && (
                    <Switch
                      size="small"
                      checkedChildren="ПРИВАТНОЕ"
                      disabled
                      defaultChecked
                    />
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      <Modal
        title={`Голосование: ${titles[selectedVoting]}`}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        {isUserModerator &&
          (userAddress !== chairPerson || currentTimestamp >= endTime) && (
            <VotingModeration votingAddress={data?.[selectedVoting]} />
          )}
        {renderModalContent()}
        <Divider />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {proposalVotes?.map((votes, index) => (
            <div key={index} style={{ width: "85%" }}>
              <Text>Кандидат "{proposalNames?.[index]}":</Text>
              <Progress
                percent={calculatePercentage(votes, totalVotes)}
                format={(percent) => `${percent.toFixed(2)}%`}
              />
            </div>
          ))}
        </div>

        <Row justify="center" style={{ marginTop: "20px" }}>
          <Col>
            <Text type="secondary" style={{ textAlign: "center" }}>
              Адрес создателя: {chairPerson}
            </Text>
          </Col>
        </Row>
      </Modal>
    </>
  );
};

export default VotingCards;
